import { useState, useCallback, useRef } from 'react';
import { uploadFile, type TaskResponse } from '@/services/api';
import { trackEvent } from '@/services/analytics';

interface UseFileUploadOptions {
  endpoint: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  extraData?: Record<string, string>;
}

interface UseFileUploadReturn {
  file: File | null;
  uploadProgress: number;
  isUploading: boolean;
  taskId: string | null;
  error: string | null;
  selectFile: (file: File) => void;
  startUpload: () => Promise<string | null>;
  reset: () => void;
}

export function useFileUpload({
  endpoint,
  maxSizeMB = 20,
  acceptedTypes,
  extraData,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const extraDataRef = useRef(extraData);
  extraDataRef.current = extraData;

  const selectFile = useCallback(
    (selectedFile: File) => {
      setError(null);
      setTaskId(null);
      setUploadProgress(0);
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'unknown';
      const sizeMb = Number((selectedFile.size / (1024 * 1024)).toFixed(2));

      // Client-side size check
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (selectedFile.size > maxBytes) {
        setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
        trackEvent('upload_rejected_client', {
          endpoint,
          reason: 'size_limit',
          file_ext: ext,
          size_mb: sizeMb,
          max_size_mb: maxSizeMB,
        });
        return;
      }

      // Client-side type check
      if (acceptedTypes && acceptedTypes.length > 0) {
        const selectedExt = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!selectedExt || !acceptedTypes.includes(selectedExt)) {
          setError(`Invalid file type. Accepted: ${acceptedTypes.join(', ')}`);
          trackEvent('upload_rejected_client', {
            endpoint,
            reason: 'invalid_type',
            file_ext: ext,
          });
          return;
        }
      }

      setFile(selectedFile);
      trackEvent('file_selected', {
        endpoint,
        file_ext: ext,
        size_mb: sizeMb,
      });
    },
    [maxSizeMB, acceptedTypes, endpoint]
  );

  const startUpload = useCallback(async (): Promise<string | null> => {
    if (!file) {
      setError('No file selected.');
      return null;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);
    trackEvent('upload_started', { endpoint });

    try {
      const response: TaskResponse = await uploadFile(
        endpoint,
        file,
        extraDataRef.current,
        (percent) => setUploadProgress(percent)
      );

      setTaskId(response.task_id);
      setIsUploading(false);
      trackEvent('upload_accepted', { endpoint });
      return response.task_id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setError(message);
      setIsUploading(false);
      trackEvent('upload_failed', { endpoint });
      return null;
    }
  }, [file, endpoint]);

  const reset = useCallback(() => {
    setFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setTaskId(null);
    setError(null);
  }, []);

  return {
    file,
    uploadProgress,
    isUploading,
    taskId,
    error,
    selectFile,
    startUpload,
    reset,
  };
}
