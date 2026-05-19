/**
 * Shared TypeScript types for the API layer.
 */

export interface QuoteInfo {
  tool: string;
  quoted_credits: number;
  charged_credits: number;
  welcome_bonus_applied: boolean;
  is_dynamic: boolean;
  file_size_kb: number;
  balance_before: number;
  balance_after: number;
}

export interface TaskResponse {
  task_id: string;
  message: string;
  quote?: QuoteInfo;
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

export interface SocialPlatformRecommendation {
  id: string;
  name: string;
  hard_limit: number;
  remaining_characters: number;
  optimal_range: { min: number; max: number };
  recommended_hashtags: { min: number; max: number };
  status: 'ready' | 'needs-work' | 'over-limit';
  score: number;
  recommendations: string[];
}

export interface SocialTextAnalysisResponse {
  input: {
    text: string;
    max_length: number;
  };
  stats: {
    words: number;
    characters: number;
    characters_no_spaces: number;
    sentences: number;
    paragraphs: number;
    hashtags: number;
    mentions: number;
    links: number;
    emojis: number;
    reading_time_seconds: number;
    tone: string;
    has_cta: boolean;
  };
  overall_score: number;
  platforms: SocialPlatformRecommendation[];
  suggestions: {
    top_priority: string;
    lowest_priority: string;
    summary: string;
  };
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
  conversion_method?: string;
  edits_applied?: number;
  page_count?: number;
  // Flowchart-specific fields
  procedures?: Array<{ id: string; title: string; description: string; pages: number[]; step_count: number }>;
  flowcharts?: Array<{ id: string; procedureId: string; title: string; steps: Array<{ id: string; type: string; title: string; description: string; connections: string[] }> }>;
  pages?: Array<{ page: number; text: string }>;
  procedures_count?: number;
  // OCR-specific fields
  text?: string;
  char_count?: number;
  total_pages?: number;
  cropped_pages?: number;
  rotated_pages?: number;
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

// --- Translate Estimate Types ---

export interface TranslateEstimateModeInfo {
  credits: number;
  available: boolean;
  label: string;
  warning?: string | null;
  estimated_usd?: number;
}

export interface TranslateEstimateAnalysis {
  pdf_type: 'text_rich' | 'sparse' | 'scanned';
  pages: number;
  file_size_kb: number;
  words_per_page: number;
  recommendation: 'text' | 'layout' | 'vision';
}

export interface TranslateEstimateResponse {
  task_id: string;
  input_path: string;
  original_filename: string;
  plan: string;
  analysis: TranslateEstimateAnalysis;
  active_model?: { id: string; name: string; is_free: boolean } | null;
  modes: {
    text: TranslateEstimateModeInfo;
    layout: TranslateEstimateModeInfo;
    vision: TranslateEstimateModeInfo;
  };
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

export interface SocialAuthProviderOption {
  id: 'google' | 'facebook' | 'x' | string;
  label: string;
  available: boolean;
  start_url: string;
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

export interface UserProfile {
  user_id: number;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture_url?: string | null;
  bio?: string | null;
}
