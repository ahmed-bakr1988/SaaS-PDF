import api from './apiClient';
import type {
  TaskResponse,
  TaskStatus,
  TranslateEstimateResponse,
  TaskErrorPayload,
} from './apiTypes';
import { resolveErrorCode } from './apiClient';

function isTaskErrorPayload(value: unknown): value is TaskErrorPayload {
  return Boolean(value) && typeof value === 'object';
}

export function getTaskErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (isTaskErrorPayload(error)) {
    // First, prefer backend-provided user_message (more specific than generic translation)
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

    // Fall back to error_code translation if no user message found
    if (typeof error.error_code === 'string') {
      const translated = resolveErrorCode(error.error_code);
      if (translated) return translated;
    }
  }

  return fallback;
}

/**
 * Upload a PDF and get per-mode translation cost estimates.
 */
export async function estimateTranslatePdf(
  file: File,
  onProgress?: (percent: number) => void
): Promise<TranslateEstimateResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<TranslateEstimateResponse>(
    '/pdf-ai/translate/estimate',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    }
  );
  return response.data;
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
