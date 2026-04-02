import axios, { type InternalAxiosRequestConfig } from 'axios';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
let csrfRefreshPromise: Promise<string> | null = null;


function getCookieValue(name: string): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(encodedName));

  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : '';
}


function shouldAttachCsrfToken(config: InternalAxiosRequestConfig): boolean {
  const method = String(config.method || 'get').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return false;
  }

  const headers = config.headers ?? {};
  if ('X-API-Key' in headers || 'x-api-key' in headers) {
    return false;
  }

  return !String(config.url || '').includes('/auth/csrf');
}


function setRequestHeader(config: InternalAxiosRequestConfig, key: string, value: string) {
  if (!config.headers) {
    config.headers = new axios.AxiosHeaders();
  }

  if (typeof (config.headers as { set?: (header: string, headerValue: string) => void }).set === 'function') {
    (config.headers as { set: (header: string, headerValue: string) => void }).set(key, value);
    return;
  }

  (config.headers as Record<string, string>)[key] = value;
}


async function ensureCsrfToken(forceRefresh = false): Promise<string> {
  const existingToken = getCookieValue(CSRF_COOKIE_NAME);
  if (existingToken && !forceRefresh) {
    return existingToken;
  }

  if (!csrfRefreshPromise) {
    csrfRefreshPromise = csrfBootstrapClient
      .get('/auth/csrf')
      .then(() => getCookieValue(CSRF_COOKIE_NAME))
      .finally(() => {
        csrfRefreshPromise = null;
      });
  }

  return csrfRefreshPromise;
}


function isCsrfFailure(status: number, bodyText: string): boolean {
  if (status !== 403) {
    return false;
  }

  const normalizedBody = bodyText.toLowerCase();
  return normalizedBody.includes('csrf');
}


async function postAssistantStream(
  payload: AssistantChatRequest,
  csrfToken: string
): Promise<Response> {
  const streamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  if (csrfToken) {
    streamHeaders[CSRF_HEADER_NAME] = csrfToken;
  }

  return fetch('/api/assistant/chat/stream', {
    method: 'POST',
    credentials: 'include',
    headers: streamHeaders,
    body: JSON.stringify(payload),
  });
}


const csrfBootstrapClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minute timeout for file processing
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  async (config) => {
    if (!shouldAttachCsrfToken(config)) {
      return config;
    }

    const csrfToken = await ensureCsrfToken();

    if (csrfToken) {
      setRequestHeader(config, CSRF_HEADER_NAME, csrfToken);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto-retry once on CSRF failure
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // Auto-retry on CSRF token mismatch (session expired, cookie lost, etc.)
      const originalRequest = error.config;
      if (
        !originalRequest._csrfRetried &&
        isCsrfFailure(
          error.response.status,
          typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data ?? '')
        )
      ) {
        originalRequest._csrfRetried = true;
        const freshToken = await ensureCsrfToken(true);
        if (freshToken) {
          setRequestHeader(originalRequest, CSRF_HEADER_NAME, freshToken);
        }
        return api(originalRequest);
      }

      if (error.response.status === 429) {
        return Promise.reject(new Error('Too many requests. Please wait a moment and try again.'));
      }

      const responseData = error.response.data;
      const message =
        responseData?.error ||
        responseData?.message ||
        (typeof responseData === 'string' && responseData.trim()
          ? responseData.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          : null) ||
        `Request failed (${error.response.status}).`;
      return Promise.reject(new Error(message));
    }
    if (error.request) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    return Promise.reject(error);
  }
);

// --- API Functions ---

export interface TaskResponse {
  task_id: string;
  message: string;
}

export interface TaskErrorPayload {
  error_code?: string;
  user_message?: string;
  task_id?: string;
  trace_id?: string;
  message?: string;
  error?: string;
  detail?: string;
}

export interface TaskStatus {
  task_id: string;
  state: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE';
  progress?: string;
  result?: TaskResult;
  error?: string | TaskErrorPayload;
}

export interface TaskResult {
  status: 'completed' | 'failed';
  download_url?: string;
  filename?: string;
  error?: string;
  error_code?: string;
  user_message?: string;
  task_id?: string;
  trace_id?: string;
  original_size?: number;
  compressed_size?: number;
  reduction_percent?: number;
  width?: number;
  height?: number;
  output_size?: number;
  duration?: number;
  fps?: number;
  format?: string;
  // Flowchart-specific fields
  procedures?: Array<{ id: string; title: string; description: string; pages: number[]; step_count: number }>;
  flowcharts?: Array<{ id: string; procedureId: string; title: string; steps: Array<{ id: string; type: string; title: string; description: string; connections: string[] }> }>;
  pages?: Array<{ page: number; text: string }>;
  procedures_count?: number;
  total_pages?: number;
  // OCR-specific fields
  text?: string;
  char_count?: number;
  // AI PDF fields
  reply?: string;
  summary?: string;
  translation?: string;
  target_language?: string;
  source_language?: string;
  detected_source_language?: string;
  provider?: string;
  chunks_translated?: number;
  pages_analyzed?: number;
  // Table extraction fields
  tables?: Array<{ page: number; table_index: number; headers: string[]; rows: string[][] }>;
  tables_found?: number;
}

function isTaskErrorPayload(value: unknown): value is TaskErrorPayload {
  return Boolean(value) && typeof value === 'object';
}

export function getTaskErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (isTaskErrorPayload(error)) {
    const candidates = [
      error.user_message,
      error.message,
      error.error,
      error.detail,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return fallback;
}

export interface AuthUser {
  id: number;
  email: string;
  plan: string;
  role: 'user' | 'admin' | string;
  is_allowlisted_admin?: boolean;
  welcome_bonus_available?: boolean;
  created_at: string;
}

export interface CreditSummary {
  credits_allocated: number;
  credits_used: number;
  credits_remaining: number;
  window_start_at: string | null;
  window_end_at: string | null;
  plan: string;
  window_days: number;
}

export interface CreditQuote {
  tool: string;
  base_cost: number;
  quoted_credits: number;
  charged_credits: number;
  welcome_bonus_applied: boolean;
  is_dynamic: boolean;
  file_size_kb: number | null;
  estimated_tokens: number | null;
  balance_before: number;
  balance_after: number;
}

export interface CostEstimate {
  tool: string;
  quoted_credits: number;
  is_dynamic: boolean;
  balance_before: number;
  balance_after: number;
  welcome_bonus_applied: boolean;
  affordable: boolean;
}

interface AuthResponse {
  message: string;
  user: AuthUser;
  credits?: CreditSummary;
  is_new_account?: boolean;
}

interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
  credits?: CreditSummary;
}

interface HistoryResponse {
  items: HistoryEntry[];
}

export interface HistoryEntry {
  id: number;
  tool: string;
  original_filename: string | null;
  output_filename: string | null;
  status: 'completed' | 'failed' | string;
  download_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AssistantHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  session_id?: string;
  fingerprint: string;
  tool_slug?: string;
  page_url?: string;
  locale?: string;
  history?: AssistantHistoryMessage[];
}

export interface AssistantChatResponse {
  session_id: string;
  reply: string;
  stored: boolean;
}

interface AssistantStreamHandlers {
  onSession?: (sessionId: string) => void;
  onChunk?: (chunk: string) => void;
}

interface AssistantStreamEvent {
  event: string;
  data: Record<string, unknown>;
}


function parseAssistantStreamEvent(rawEvent: string): AssistantStreamEvent | null {
  const lines = rawEvent.split(/\r?\n/);
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return {
    event,
    data: JSON.parse(dataLines.join('\n')) as Record<string, unknown>,
  };
}


function normalizeStreamError(status: number, bodyText: string): Error {
  if (!bodyText.trim()) {
    return new Error(`Request failed (${status}).`);
  }

  try {
    const parsed = JSON.parse(bodyText) as { error?: string; message?: string };
    return new Error(parsed.error || parsed.message || `Request failed (${status}).`);
  } catch {
    return new Error(bodyText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
  }
}

/**
 * Upload a file and start a processing task.
 */
export async function uploadFile(
  endpoint: string,
  file: File,
  extraData?: Record<string, string>,
  onProgress?: (percent: number) => void
): Promise<TaskResponse> {
  const formData = new FormData();
  formData.append('file', file);

  if (extraData) {
    Object.entries(extraData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const response = await api.post<TaskResponse>(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    },
  });

  return response.data;
}

/**
 * Upload multiple files and start a processing task.
 */
export async function uploadFiles(
  endpoint: string,
  files: File[],
  fileField = 'files',
  extraData?: Record<string, string>,
  onProgress?: (percent: number) => void
): Promise<TaskResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append(fileField, file));

  if (extraData) {
    Object.entries(extraData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const response = await api.post<TaskResponse>(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    },
  });

  return response.data;
}

/**
 * Start a task endpoint that does not require file upload.
 */
export async function startTask(endpoint: string): Promise<TaskResponse> {
  const response = await api.post<TaskResponse>(endpoint);
  return response.data;
}

/**
 * Create a new account and return the auth response.
 */
export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', { email, password });
  await ensureCsrfToken(true);
  return response.data;
}

/**
 * Sign in and return the auth response.
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });
  await ensureCsrfToken(true);
  return response.data;
}

/**
 * End the current authenticated session.
 */
export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
  await ensureCsrfToken(true);
}

/**
 * Claim an anonymous task into the authenticated user's history.
 */
export async function claimTask(taskId: string, tool: string): Promise<{ claimed: boolean }> {
  const response = await api.post<{ claimed: boolean }>('/account/claim-task', {
    task_id: taskId,
    tool,
  });
  return response.data;
}

/**
 * Return the current authenticated user, if any.
 */
export async function getCurrentUser(): Promise<AuthSessionResponse> {
  const response = await api.get<AuthSessionResponse>('/auth/me');
  return response.data;
}

/**
 * Return recent authenticated file history.
 */
export async function getHistory(limit = 50): Promise<HistoryEntry[]> {
  const response = await api.get<HistoryResponse>('/history', {
    params: { limit },
  });
  return response.data.items;
}

/**
 * Poll task status.
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const response = await api.get<TaskStatus>(`/tasks/${taskId}/status`);
  return response.data;
}

export function getApiClient() {
  return api;
}

/**
 * Send one message to the site assistant.
 */
export async function chatWithAssistant(
  payload: AssistantChatRequest
): Promise<AssistantChatResponse> {
  const response = await api.post<AssistantChatResponse>('/assistant/chat', payload);
  return response.data;
}


/**
 * Stream one assistant response incrementally over SSE.
 */
export async function streamAssistantChat(
  payload: AssistantChatRequest,
  handlers: AssistantStreamHandlers = {}
): Promise<AssistantChatResponse> {
  let response = await postAssistantStream(payload, await ensureCsrfToken());

  if (!response.ok) {
    let bodyText = await response.text();

    if (isCsrfFailure(response.status, bodyText)) {
      response = await postAssistantStream(payload, await ensureCsrfToken(true));
      if (!response.ok) {
        bodyText = await response.text();
        throw normalizeStreamError(response.status, bodyText);
      }
    } else {
      throw normalizeStreamError(response.status, bodyText);
    }
  }

  if (!response.body) {
    throw new Error('Streaming is not supported by this browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResponse: AssistantChatResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsedEvent = parseAssistantStreamEvent(rawEvent);

      if (parsedEvent?.event === 'session') {
        const sessionId = parsedEvent.data.session_id;
        if (typeof sessionId === 'string') {
          handlers.onSession?.(sessionId);
        }
      }

      if (parsedEvent?.event === 'chunk') {
        const chunk = parsedEvent.data.content;
        if (typeof chunk === 'string' && chunk) {
          handlers.onChunk?.(chunk);
        }
      }

      if (parsedEvent?.event === 'done') {
        const sessionId = parsedEvent.data.session_id;
        const reply = parsedEvent.data.reply;
        const stored = parsedEvent.data.stored;
        if (
          typeof sessionId === 'string' &&
          typeof reply === 'string' &&
          typeof stored === 'boolean'
        ) {
          finalResponse = {
            session_id: sessionId,
            reply,
            stored,
          };
        }
      }

      boundary = buffer.indexOf('\n\n');
    }

    if (done) {
      break;
    }
  }

  if (!finalResponse) {
    throw new Error('Assistant stream ended unexpectedly.');
  }

  return finalResponse;
}

/**
 * Check API health.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await api.get('/health');
    return response.data.status === 'healthy';
  } catch {
    return false;
  }
}

export interface PublicStatsSummary {
  total_files_processed: number;
  completed_files: number;
  failed_files: number;
  success_rate: number;
  files_last_24h: number;
  average_rating: number;
  rating_count: number;
  top_tools: Array<{ tool: string; count: number }>;
}

/**
 * Return public site stats used for social proof and developer onboarding.
 */
export async function getPublicStats(): Promise<PublicStatsSummary> {
  const response = await api.get<PublicStatsSummary>('/stats/summary');
  return response.data;
}

export interface InternalAdminUser {
  id: number;
  email: string;
  plan: 'free' | 'pro' | string;
  role: 'user' | 'admin' | string;
  is_allowlisted_admin: boolean;
  created_at: string;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  active_api_keys: number;
}

export interface InternalAdminContact {
  id: number;
  name: string;
  email: string;
  category: string;
  subject: string | null;
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface InternalAdminOverview {
  users: {
    total: number;
    pro: number;
    free: number;
  };
  processing: {
    total_files_processed: number;
    completed_files: number;
    failed_files: number;
    files_last_24h: number;
    success_rate: number;
  };
  ratings: {
    average_rating: number;
    rating_count: number;
  };
  ai_cost: {
    month: string;
    total_usd: number;
    budget_usd: number;
    percent_used: number;
  };
  contacts: {
    total_messages: number;
    unread_messages: number;
    recent: InternalAdminContact[];
  };
  top_tools: Array<{
    tool: string;
    total_runs: number;
    failed_runs: number;
  }>;
  recent_failures: Array<{
    id: number;
    user_id: number | null;
    email: string | null;
    tool: string;
    original_filename: string | null;
    created_at: string;
    metadata: Record<string, unknown>;
  }>;
  recent_users: Array<{
    id: number;
    email: string;
    plan: string;
    created_at: string;
    total_tasks: number;
    active_api_keys: number;
  }>;
}

export async function getInternalAdminOverview(): Promise<InternalAdminOverview> {
  const response = await api.get<InternalAdminOverview>('/internal/admin/overview');
  return response.data;
}

export async function listInternalAdminUsers(query = '', limit = 25): Promise<InternalAdminUser[]> {
  const response = await api.get<{ items: InternalAdminUser[] }>('/internal/admin/users', {
    params: {
      query,
      limit,
    },
  });
  return response.data.items;
}

export async function getInternalAdminContacts(page = 1, perPage = 20): Promise<{
  items: InternalAdminContact[];
  page: number;
  per_page: number;
  total: number;
  unread: number;
}> {
  const response = await api.get<{
    items: InternalAdminContact[];
    page: number;
    per_page: number;
    total: number;
    unread: number;
  }>('/internal/admin/contacts', {
    params: {
      page,
      per_page: perPage,
    },
  });
  return response.data;
}

export async function markInternalAdminContactRead(messageId: number): Promise<void> {
  await api.post(`/internal/admin/contacts/${messageId}/read`);
}

export async function updateInternalAdminUserPlan(
  userId: number,
  plan: 'free' | 'pro'
): Promise<AuthUser> {
  const response = await api.post<{ message: string; user: AuthUser }>(
    `/internal/admin/users/${userId}/plan`,
    { plan }
  );
  return response.data.user;
}

export async function updateInternalAdminUserRole(
  userId: number,
  role: 'user' | 'admin'
): Promise<AuthUser> {
  const response = await api.post<{ message: string; user: AuthUser }>(
    `/internal/admin/users/${userId}/role`,
    { role }
  );
  return response.data.user;
}

// --- Enhanced Admin Analytics ---

export interface AdminRatingItem {
  id: number;
  tool: string;
  rating: number;
  feedback: string;
  tag: string;
  created_at: string;
}

export interface AdminToolSummary {
  tool: string;
  count: number;
  average: number;
  positive: number;
  negative: number;
}

export interface AdminRatingsDetail {
  items: AdminRatingItem[];
  page: number;
  per_page: number;
  total: number;
  tool_summaries: AdminToolSummary[];
}

export interface AdminToolAnalyticsItem {
  tool: string;
  total_runs: number;
  completed: number;
  failed: number;
  success_rate: number;
  runs_24h: number;
  runs_7d: number;
  runs_30d: number;
  unique_users: number;
}

export interface AdminDailyUsage {
  day: string;
  total: number;
  completed: number;
  failed: number;
}

export interface AdminCommonError {
  tool: string;
  error: string;
  occurrences: number;
}

export interface AdminToolAnalytics {
  tools: AdminToolAnalyticsItem[];
  daily_usage: AdminDailyUsage[];
  common_errors: AdminCommonError[];
}

export interface AdminUserStats {
  total_users: number;
  new_last_7d: number;
  new_last_30d: number;
  pro_users: number;
  free_users: number;
  daily_registrations: Array<{ day: string; count: number }>;
  most_active_users: Array<{
    id: number;
    email: string;
    plan: string;
    created_at: string;
    total_tasks: number;
  }>;
}

export interface AdminPlanInterest {
  total_clicks: number;
  unique_users: number;
  clicks_last_7d: number;
  clicks_last_30d: number;
  by_plan: Array<{ plan: string; billing: string; clicks: number }>;
  recent: Array<{
    id: number;
    user_id: number | null;
    email: string | null;
    plan: string;
    billing: string;
    created_at: string;
  }>;
}

export interface AdminSystemHealth {
  ai_configured: boolean;
  ai_model: string;
  ai_budget_used_percent: number;
  error_rate_1h: number;
  tasks_last_1h: number;
  failures_last_1h: number;
  database_size_mb: number;
  database_type: string;
}

export interface DatabaseStats {
  database_type: string;
  tables: Array<{
    table_name: string;
    row_count: number;
    total_size_kb?: number;
    data_size_kb?: number;
  }>;
  table_count: number;
}

export async function getAdminRatingsDetail(page = 1, perPage = 20, tool = ''): Promise<AdminRatingsDetail> {
  const response = await api.get<AdminRatingsDetail>('/internal/admin/ratings', {
    params: { page, per_page: perPage, ...(tool ? { tool } : {}) },
  });
  return response.data;
}

export async function getAdminToolAnalytics(): Promise<AdminToolAnalytics> {
  const response = await api.get<AdminToolAnalytics>('/internal/admin/tool-analytics');
  return response.data;
}

export async function getAdminUserStats(): Promise<AdminUserStats> {
  const response = await api.get<AdminUserStats>('/internal/admin/user-stats');
  return response.data;
}

export async function getAdminPlanInterest(): Promise<AdminPlanInterest> {
  const response = await api.get<AdminPlanInterest>('/internal/admin/plan-interest');
  return response.data;
}

export async function getAdminSystemHealth(): Promise<AdminSystemHealth> {
  const response = await api.get<AdminSystemHealth>('/internal/admin/system-health');
  return response.data;
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  const response = await api.get<DatabaseStats>('/internal/admin/database-stats');
  return response.data;
}

export interface ProjectEvent {
  time: string;
  type: string;
  detail: string;
  entity_id: number;
}

export interface ProjectEventsResponse {
  events: ProjectEvent[];
  summary: Record<string, number>;
  total_events: number;
  period_days: number;
}

export async function getProjectEvents(days = 30): Promise<ProjectEventsResponse> {
  const response = await api.get<ProjectEventsResponse>('/internal/admin/project-events', {
    params: { days },
  });
  return response.data;
}

export async function createAdminUser(email: string, password: string, plan = 'free', role = 'user'): Promise<{ message: string; user: InternalAdminUser }> {
  const response = await api.post('/internal/admin/users/create', { email, password, plan, role });
  return response.data;
}

export async function deleteAdminUser(userId: number): Promise<{ message: string }> {
  const response = await api.delete(`/internal/admin/users/${userId}`);
  return response.data;
}

export async function updateAdminUserPlan(userId: number, plan: string): Promise<{ message: string; user: InternalAdminUser }> {
  const response = await api.put(`/internal/admin/users/${userId}/plan`, { plan });
  return response.data;
}

export async function updateAdminUserRole(userId: number, role: string): Promise<{ message: string; user: InternalAdminUser }> {
  const response = await api.put(`/internal/admin/users/${userId}/role`, { role });
  return response.data;
}

// --- Account / Usage / API Keys ---

export interface CreditInfo {
  credits_allocated: number;
  credits_used: number;
  credits_remaining: number;
  window_start: string | null;
  window_end: string | null;
  plan: string;
}

export interface UsageSummary {
  plan: string;
  period_month?: string;
  ads_enabled: boolean;
  history_limit: number;
  file_limits_mb: {
    pdf: number;
    word: number;
    image: number;
    video: number;
    homepageSmartUpload: number;
  };
  credits: CreditInfo;
  tool_costs: Record<string, number>;
  web_quota: { used: number; limit: number | null };
  api_quota?: { used: number; limit: number | null };
}

export interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  raw_key?: string; // only present on creation
}

/**
 * Return the current user's plan, quota, and file-limit summary.
 */
export async function getUsage(): Promise<UsageSummary> {
  const response = await api.get<UsageSummary>('/account/usage');
  return response.data;
}

/**
 * Return all API keys for the authenticated pro user.
 */
export async function getApiKeys(): Promise<ApiKey[]> {
  const response = await api.get<{ items: ApiKey[] }>('/account/api-keys');
  return response.data.items;
}

/**
 * Create a new API key with the given name. Returns the key including raw_key once.
 */
export async function createApiKey(name: string): Promise<ApiKey> {
  const response = await api.post<ApiKey>('/account/api-keys', { name });
  return response.data;
}

/**
 * Revoke one API key by id.
 */
export async function revokeApiKey(keyId: number): Promise<void> {
  await api.delete(`/account/api-keys/${keyId}`);
}

/**
 * Get a cost estimate before executing a tool.
 */
export async function estimateCost(
  tool: string,
  fileSizeKb?: number,
  estimatedTokens?: number
): Promise<CostEstimate> {
  const response = await api.post<CostEstimate>('/account/estimate', {
    tool,
    file_size_kb: fileSizeKb,
    estimated_tokens: estimatedTokens,
  });
  return response.data;
}

/**
 * Get credit info including dynamic tools.
 */
export async function getCreditInfo(): Promise<CreditInfo & { dynamic_tools?: Record<string, unknown> }> {
  const response = await api.get<CreditInfo & { dynamic_tools?: Record<string, unknown> }>('/account/credit-info');
  return response.data;
}

export default api;
