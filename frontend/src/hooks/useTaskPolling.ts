import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import i18n from '@/i18n';
import {
  getTaskStatus,
  getTaskErrorMessage,
  type TaskStatus,
  type TaskResult,
} from '@/services/api';
import { trackEvent } from '@/services/analytics';

interface UseTaskPollingOptions {
  taskId: string | null;
  intervalMs?: number;
  /** Maximum interval after backoff (default: 5000ms) */
  maxIntervalMs?: number;
  /** Number of polls before first backoff step (default: 10) */
  backoffAfter?: number;
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

/**
 * Adaptive polling intervals:
 *  - First `backoffAfter` polls: use `intervalMs` (default 1500ms)
 *  - Next `backoffAfter` polls: use `intervalMs * 2` (default 3000ms)
 *  - After that: use `maxIntervalMs` (default 5000ms)
 *
 * This reduces server load for long-running tasks (e.g. AI translation)
 * while keeping fast feedback for quick tasks.
 */
export function useTaskPolling({
  taskId,
  intervalMs = 1500,
  maxIntervalMs = 5000,
  backoffAfter = 10,
  onComplete,
  onError,
}: UseTaskPollingOptions): UseTaskPollingReturn {
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [result, setResult] = useState<TaskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pollCountRef.current = 0;
    setIsPolling(false);
  }, []);

  /** Calculate the current interval based on how many polls have happened */
  const getCurrentInterval = useCallback(() => {
    const count = pollCountRef.current;
    if (count < backoffAfter) return intervalMs;
    if (count < backoffAfter * 2) return Math.min(intervalMs * 2, maxIntervalMs);
    return maxIntervalMs;
  }, [intervalMs, maxIntervalMs, backoffAfter]);

  useEffect(() => {
    if (!taskId) return;

    setIsPolling(true);
    setResult(null);
    setError(null);
    pollCountRef.current = 0;

    const poll = async () => {
      try {
        const taskStatus = await getTaskStatus(taskId);
        setStatus(taskStatus);

        if (taskStatus.state === 'SUCCESS') {
          stopPolling();
          const taskResult = taskStatus.result;
          const fallbackError = i18n.t('common.errors.processingFailed');

          if (taskResult?.status === 'completed') {
            setResult(taskResult);
            toast.success(i18n.t('result.conversionComplete'), {
              description: i18n.t('result.downloadReady'),
            });
            trackEvent('task_completed', { task_id: taskId });
            onComplete?.(taskResult);
          } else {
            const errMsg = getTaskErrorMessage(
              taskStatus.error ?? taskResult?.user_message ?? taskResult?.error,
              fallbackError
            );
            setError(errMsg);
            toast.error(errMsg);
            trackEvent('task_failed', { task_id: taskId, reason: 'result_failed' });
            onError?.(errMsg);
          }
        } else if (taskStatus.state === 'FAILURE') {
          stopPolling();
          const errMsg = getTaskErrorMessage(
            taskStatus.error,
            i18n.t('common.errors.processingFailed')
          );
          setError(errMsg);
          toast.error(errMsg);
          trackEvent('task_failed', { task_id: taskId, reason: 'state_failure' });
          onError?.(errMsg);
        } else {
          // Task still in progress — schedule next poll with adaptive interval
          pollCountRef.current += 1;
          timeoutRef.current = setTimeout(poll, getCurrentInterval());
        }
      } catch (err) {
        stopPolling();
        const errMsg = err instanceof Error ? err.message : i18n.t('common.errors.networkError');
        setError(errMsg);
        toast.error(errMsg);
        trackEvent('task_failed', { task_id: taskId, reason: 'polling_error' });
        onError?.(errMsg);
      }
    };

    // Poll immediately, then schedule adaptive intervals
    poll();

    return () => {
      stopPolling();
    };
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, isPolling, result, error, stopPolling };
}
