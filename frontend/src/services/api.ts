import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minute timeout for file processing
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

export default api;
