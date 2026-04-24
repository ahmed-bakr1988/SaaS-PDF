import axios, { type InternalAxiosRequestConfig } from 'axios';
import i18n from '@/i18n';

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


export function setRequestHeader(config: InternalAxiosRequestConfig, key: string, value: string) {
  if (!config.headers) {
    config.headers = new axios.AxiosHeaders();
  }

  if (typeof (config.headers as { set?: (header: string, headerValue: string) => void }).set === 'function') {
    (config.headers as { set: (header: string, headerValue: string) => void }).set(key, value);
    return;
  }

  (config.headers as Record<string, string>)[key] = value;
}


export async function ensureCsrfToken(forceRefresh = false): Promise<string> {
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


export function isCsrfFailure(status: number, bodyText: string): boolean {
  if (status !== 403) {
    return false;
  }

  const normalizedBody = bodyText.toLowerCase();
  return normalizedBody.includes('csrf');
}


/**
 * Maps a backend error_code to a fully translated message via i18n.
 * Returns null when no specific mapping exists (caller should fall back to user_message or generic).
 */
export function resolveErrorCode(errorCode: string): string | null {
  const map: Record<string, string> = {
    TASK_FAILURE: i18n.t('common.errors.processingFailed'),
    CELERY_NOT_REGISTERED: i18n.t('common.errors.taskUnavailable'),
    // Gemini AI error codes (new)
    AI_UNAUTHORIZED: i18n.t('common.errors.aiUnavailable'),
    AI_RATE_LIMIT: i18n.t('common.errors.aiRateLimited'),
    AI_SERVER_ERROR: i18n.t('common.errors.serverError'),
    AI_CONNECTION_ERROR: i18n.t('common.errors.networkError'),
    AI_TIMEOUT: i18n.t('common.errors.serverError'),
    AI_MISSING_API_KEY: i18n.t('common.errors.aiUnavailable'),
    AI_EMPTY_RESPONSE: i18n.t('common.errors.aiUnavailable'),
    AI_ERROR_PAYLOAD: i18n.t('common.errors.aiUnavailable'),
    AI_REQUEST_ERROR: i18n.t('common.errors.serverError'),
    AI_BAD_REQUEST: i18n.t('common.errors.invalidInput'),
    AI_BUDGET_EXCEEDED: i18n.t('common.errors.aiBudgetExceeded'),
    // Legacy OpenRouter codes kept for backward-compat during transition
    OPENROUTER_UNAUTHORIZED: i18n.t('common.errors.aiUnavailable'),
    OPENROUTER_RATE_LIMIT: i18n.t('common.errors.aiRateLimited'),
    OPENROUTER_INSUFFICIENT_CREDITS: i18n.t('common.errors.aiRateLimited'),
    OPENROUTER_SERVER_ERROR: i18n.t('common.errors.serverError'),
    OPENROUTER_CONNECTION_ERROR: i18n.t('common.errors.networkError'),
    OPENROUTER_TIMEOUT: i18n.t('common.errors.serverError'),
    OPENROUTER_MISSING_API_KEY: i18n.t('common.errors.aiUnavailable'),
    OPENROUTER_EMPTY_RESPONSE: i18n.t('common.errors.aiUnavailable'),
    OPENROUTER_ERROR_PAYLOAD: i18n.t('common.errors.aiUnavailable'),
    OPENROUTER_REQUEST_ERROR: i18n.t('common.errors.serverError'),
    DEEPL_NOT_CONFIGURED: i18n.t('common.errors.translationFailed'),
    DEEPL_UNSUPPORTED_TARGET_LANGUAGE: i18n.t('common.errors.invalidInput'),
    DEEPL_TIMEOUT: i18n.t('common.errors.translationFailed'),
    DEEPL_CONNECTION_ERROR: i18n.t('common.errors.networkError'),
    DEEPL_REQUEST_ERROR: i18n.t('common.errors.translationFailed'),
    DEEPL_RATE_LIMIT: i18n.t('common.errors.aiRateLimited'),
    DEEPL_SERVER_ERROR: i18n.t('common.errors.serverError'),
    DEEPL_CREDITS_OR_PERMISSIONS: i18n.t('common.errors.translationFailed'),
    DEEPL_EMPTY_RESPONSE: i18n.t('common.errors.translationFailed'),
    DEEPL_EMPTY_TEXT: i18n.t('common.errors.pdfTextEmpty'),
    TRANSLATION_PROVIDER_FAILED: i18n.t('common.errors.translationFailed'),
    PDF_ENCRYPTED: i18n.t('common.errors.pdfEncrypted'),
    PDF_TEXT_EXTRACTION_FAILED: i18n.t('common.errors.processingFailed'),
    PDF_TEXT_EMPTY: i18n.t('common.errors.pdfTextEmpty'),
    PDF_AI_INVALID_INPUT: i18n.t('common.errors.invalidInput'),
    PDF_AI_ERROR: i18n.t('common.errors.processingFailed'),
    PDF_TABLES_NOT_FOUND: i18n.t('common.errors.pdfNoTables'),
    PDF_TABLE_EXTRACTION_FAILED: i18n.t('common.errors.processingFailed'),
    TABULA_NOT_INSTALLED: i18n.t('common.errors.serverError'),
  };
  return map[errorCode] ?? null;
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
        return Promise.reject(new Error(i18n.t('common.errors.rateLimited')));
      }

      const responseData = error.response.data;
      const errorCode: string | undefined = responseData?.error_code;
      if (errorCode) {
        const mapped = resolveErrorCode(errorCode);
        if (mapped) return Promise.reject(new Error(mapped));
      }
      const message =
        responseData?.user_message ||
        responseData?.error ||
        responseData?.message ||
        (typeof responseData === 'string' && responseData.trim()
          ? responseData.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          : null) ||
        i18n.t('common.errors.serverError');
      return Promise.reject(new Error(message));
    }
    if (error.request) {
      return Promise.reject(new Error(i18n.t('common.errors.networkError')));
    }
    return Promise.reject(error);
  }
);

export function getApiClient() {
  return api;
}

export default api;
