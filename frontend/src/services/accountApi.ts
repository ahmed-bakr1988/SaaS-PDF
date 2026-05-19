import api from './apiClient';
import type {
  HistoryEntry,
  CostEstimate,
  CreditInfo,
  UsageSummary,
  ApiKey,
  PublicStatsSummary,
  UserProfile,
} from './apiTypes';

interface HistoryResponse {
  items: HistoryEntry[];
}

/**
 * Return the extended profile for the authenticated user.
 */
export async function getProfile(): Promise<UserProfile> {
  const response = await api.get<UserProfile>('/account/profile');
  return response.data;
}

/**
 * Update user profile data.
 */
export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  const response = await api.post<UserProfile>('/account/profile', data);
  return response.data;
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
 * Return recent authenticated file history.
 */
export async function getHistory(limit = 50): Promise<HistoryEntry[]> {
  const response = await api.get<HistoryResponse>('/history', {
    params: { limit },
  });
  return response.data.items;
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

/**
 * Return public site stats used for social proof and developer onboarding.
 */
export async function getPublicStats(): Promise<PublicStatsSummary> {
  const response = await api.get<PublicStatsSummary>('/stats/summary');
  return response.data;
}
