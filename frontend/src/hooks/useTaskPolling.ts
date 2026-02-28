import { useState, useEffect, useCallback, useRef } from 'react';
import { getTaskStatus, type TaskStatus, type TaskResult } from '@/services/api';

interface UseTaskPollingOptions {
  taskId: string | null;
  intervalMs?: number;
  onComplete?: (result: TaskResult) => void;
  onError?: (error: string) => void;
}

interface UseTaskPollingReturn {
  status: TaskStatus | null;
  isPolling: boolean;
  result: TaskResult | null;
  error: string | null;
  stopPolling: () => void;
}

export function useTaskPolling({
  taskId,
  intervalMs = 1500,
  onComplete,
  onError,
}: UseTaskPollingOptions): UseTaskPollingReturn {
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!taskId) return;

    setIsPolling(true);
    setResult(null);
    setError(null);

    const poll = async () => {
      try {
        const taskStatus = await getTaskStatus(taskId);
        setStatus(taskStatus);

        if (taskStatus.state === 'SUCCESS') {
          stopPolling();
          const taskResult = taskStatus.result;

          if (taskResult?.status === 'completed') {
            setResult(taskResult);
            onComplete?.(taskResult);
          } else {
            const errMsg = taskResult?.error || 'Processing failed.';
            setError(errMsg);
            onError?.(errMsg);
          }
        } else if (taskStatus.state === 'FAILURE') {
          stopPolling();
          const errMsg = taskStatus.error || 'Task failed.';
          setError(errMsg);
          onError?.(errMsg);
        }
      } catch (err) {
        stopPolling();
        const errMsg = err instanceof Error ? err.message : 'Polling failed.';
        setError(errMsg);
        onError?.(errMsg);
      }
    };

    // Poll immediately, then set interval
    poll();
    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      stopPolling();
    };
  }, [taskId, intervalMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, isPolling, result, error, stopPolling };
}
