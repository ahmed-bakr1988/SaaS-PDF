import axios from 'axios';

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
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
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

export interface TaskStatus {
  task_id: string;
  state: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE';
  progress?: string;
  result?: TaskResult;
  error?: string;
}

export interface TaskResult {
  status: 'completed' | 'failed';
  download_url?: string;
  filename?: string;
  error?: string;
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
}

export interface AuthUser {
  id: number;
  email: string;
  plan: string;
  created_at: string;
}

interface AuthResponse {
  message: string;
  user: AuthUser;
}

interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
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
 * Create a new account and return the authenticated user.
 */
export async function registerUser(email: string, password: string): Promise<AuthUser> {
  const response = await api.post<AuthResponse>('/auth/register', { email, password });
  return response.data.user;
}

/**
 * Sign in and return the authenticated user.
 */
export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });
  return response.data.user;
}

/**
 * End the current authenticated session.
 */
export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
}

/**
 * Return the current authenticated user, if any.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await api.get<AuthSessionResponse>('/auth/me');
  return response.data.user;
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

// --- Account / Usage / API Keys ---

export interface UsageSummary {
  plan: string;
  period_month: string;
  ads_enabled: boolean;
  history_limit: number;
  file_limits_mb: {
    pdf: number;
    word: number;
    image: number;
    video: number;
    homepageSmartUpload: number;
  };
  web_quota: { used: number; limit: number | null };
  api_quota: { used: number; limit: number | null };
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

export default api;
