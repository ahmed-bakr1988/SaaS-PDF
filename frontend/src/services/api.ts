/**
 * API barrel file — re-exports everything from the split modules so existing
 * `import { ... } from '@/services/api'` statements continue working without changes.
 *
 * New code should import directly from the specific module for better tree-shaking:
 *   import { uploadFile } from '@/services/toolsApi';
 *   import { loginUser } from '@/services/authApi';
 */

// Core client & helpers
export { default, getApiClient, resolveErrorCode } from './apiClient';

// Types
export type {
  QuoteInfo,
  TaskResponse,
  TaskErrorPayload,
  TaskStatus,
  TaskResult,
  AuthUser,
  CreditSummary,
  CreditQuote,
  CostEstimate,
  TranslateEstimateModeInfo,
  TranslateEstimateAnalysis,
  TranslateEstimateResponse,
  HistoryEntry,
  SocialAuthProviderOption,
  AssistantHistoryMessage,
  AssistantChatRequest,
  AssistantChatResponse,
  PublicStatsSummary,
  CreditInfo,
  UsageSummary,
  ApiKey,
  UserProfile,
} from './apiTypes';

// Auth
export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getSocialAuthProviders,
} from './authApi';

// Tools / file processing
export {
  getTaskErrorMessage,
  estimateTranslatePdf,
  uploadFile,
  uploadFiles,
  startTask,
  getTaskStatus,
  checkHealth,
} from './toolsApi';

// Account / usage
export {
  claimTask,
  getHistory,
  getUsage,
  getApiKeys,
  createApiKey,
  revokeApiKey,
  estimateCost,
  getCreditInfo,
  getPublicStats,
  getProfile,
  updateProfile,
} from './accountApi';

// Assistant chat
export {
  chatWithAssistant,
  streamAssistantChat,
} from './assistantApi';

// Admin (re-export types and functions)
export type {
  InternalAdminUser,
  InternalAdminContact,
  InternalAdminOverview,
  AdminRatingItem,
  AdminToolSummary,
  AdminRatingsDetail,
  AdminToolAnalyticsItem,
  AdminDailyUsage,
  AdminCommonError,
  AdminToolAnalytics,
  AdminUserStats,
  AdminPlanInterest,
  AdminSystemHealth,
  DatabaseStats,
  AdminAiModel,
  AdminAiModelsResponse,
  ProjectEvent,
  ProjectEventsResponse,
} from './adminApi';

export {
  getInternalAdminOverview,
  listInternalAdminUsers,
  getInternalAdminContacts,
  markInternalAdminContactRead,
  updateInternalAdminUserPlan,
  updateInternalAdminUserRole,
  getAdminRatingsDetail,
  getAdminToolAnalytics,
  getAdminUserStats,
  getAdminPlanInterest,
  getAdminSystemHealth,
  getDatabaseStats,
  getAdminAiModels,
  updateAdminAiModel,
  resetAdminAiModel,
  getProjectEvents,
  createAdminUser,
  deleteAdminUser,
  updateAdminUserPlan,
  updateAdminUserRole,
} from './adminApi';
