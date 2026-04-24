import api from './apiClient';
import type { AuthUser } from './apiTypes';

// --- Admin Types ---

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

export interface AdminAiModel {
  id: string;
  name: string;
  is_free: boolean;
  context_length: number;
  description: string;
}

export interface AdminAiModelsResponse {
  current_model: string;
  model_source: 'redis' | 'env' | 'default';
  models: AdminAiModel[];
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

// --- Admin API Functions ---

export async function getInternalAdminOverview(): Promise<InternalAdminOverview> {
  const response = await api.get<InternalAdminOverview>('/internal/admin/overview');
  return response.data;
}

export async function listInternalAdminUsers(query = '', limit = 25): Promise<InternalAdminUser[]> {
  const response = await api.get<{ items: InternalAdminUser[] }>('/internal/admin/users', {
    params: { query, limit },
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
    params: { page, per_page: perPage },
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

export async function getAdminAiModels(): Promise<AdminAiModelsResponse> {
  const response = await api.get<AdminAiModelsResponse>('/internal/admin/ai-models');
  return response.data;
}

export async function updateAdminAiModel(model: string): Promise<{ message: string; model: string; persisted: boolean }> {
  const response = await api.put<{ message: string; model: string; persisted: boolean }>('/internal/admin/ai-model', { model });
  return response.data;
}

export async function resetAdminAiModel(): Promise<{ message: string; model: string; deleted: boolean }> {
  const response = await api.delete<{ message: string; model: string; deleted: boolean }>('/internal/admin/ai-model');
  return response.data;
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
