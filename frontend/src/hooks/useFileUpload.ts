import { useState, useCallback, useRef } from 'react';
import { uploadFile, type TaskResponse } from '@/services/api';

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

      // Client-side size check
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (selectedFile.size > maxBytes) {
        setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
        return;
      }

      // Client-side type check
      if (acceptedTypes && acceptedTypes.length > 0) {
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!ext || !acceptedTypes.includes(ext)) {
          setError(`Invalid file type. Accepted: ${acceptedTypes.join(', ')}`);
          return;
        }
      }

      setFile(selectedFile);
    },
    [maxSizeMB, acceptedTypes]
  );

  const startUpload = useCallback(async (): Promise<string | null> => {
    if (!file) {
      setError('No file selected.');
      return null;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const response: TaskResponse = await uploadFile(
        endpoint,
        file,
        extraDataRef.current,
        (percent) => setUploadProgress(percent)
      );

      setTaskId(response.task_id);
      setIsUploading(false);
      return response.task_id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setError(message);
      setIsUploading(false);
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
