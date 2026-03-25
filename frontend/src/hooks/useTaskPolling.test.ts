import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskPolling } from './useTaskPolling';

// ── mock the api module ────────────────────────────────────────────────────
vi.mock('@/services/api', () => ({
  getTaskStatus: vi.fn(),
}));

import { getTaskStatus } from '@/services/api';
const mockGetStatus = vi.mocked(getTaskStatus);

// ── tests ──────────────────────────────────────────────────────────────────
describe('useTaskPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── initial state ──────────────────────────────────────────────────────
  it('starts idle when taskId is null', () => {
    const { result } = renderHook(() =>
      useTaskPolling({ taskId: null })
    );
    expect(result.current.isPolling).toBe(false);
    expect(result.current.status).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  // ── begins polling immediately ─────────────────────────────────────────
  it('polls immediately when taskId is provided', async () => {
    mockGetStatus.mockResolvedValue({
      task_id: 'task-1',
      state: 'PENDING',
    });

    const { result } = renderHook(() =>
      useTaskPolling({ taskId: 'task-1', intervalMs: 1000 })
    );

    // Advance just enough to let the immediate poll() Promise resolve,
    // but NOT enough to trigger the setInterval tick (< 1000ms).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(mockGetStatus).toHaveBeenCalledWith('task-1');
    expect(result.current.isPolling).toBe(true);
    expect(result.current.status?.state).toBe('PENDING');
  });

  // ── polls at the configured interval ─────────────────────────────────
  it('polls again after the interval elapses', async () => {
    mockGetStatus.mockResolvedValue({ task_id: 'task-2', state: 'PROCESSING' });

    renderHook(() =>
      useTaskPolling({ taskId: 'task-2', intervalMs: 1500 })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500 * 3 + 100); // 3 intervals
    });

    // At least 3 calls (initial + 3 interval ticks)
    expect(mockGetStatus.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  // ── SUCCESS state ──────────────────────────────────────────────────────
  it('stops polling and sets result on SUCCESS with completed status', async () => {
    const taskResult = {
      status: 'completed' as const,
      download_url: '/api/download/task-3/output.pdf',
      filename: 'output.pdf',
    };
    mockGetStatus.mockResolvedValueOnce({ task_id: 'task-3', state: 'PENDING' });
    mockGetStatus.mockResolvedValueOnce({
      task_id: 'task-3',
      state: 'SUCCESS',
      result: taskResult,
    });

    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTaskPolling({ taskId: 'task-3', intervalMs: 500, onComplete })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.result).toEqual(taskResult);
    expect(result.current.error).toBeNull();
    expect(onComplete).toHaveBeenCalledWith(taskResult);
  });

  // ── SUCCESS with error in result ───────────────────────────────────────
  it('sets error when SUCCESS result contains status "failed"', async () => {
    mockGetStatus.mockResolvedValueOnce({
      task_id: 'task-4',
      state: 'SUCCESS',
      result: { status: 'failed', error: 'Ghostscript not found.' },
    });

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useTaskPolling({ taskId: 'task-4', intervalMs: 500, onError })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe('Ghostscript not found.');
    expect(onError).toHaveBeenCalledWith('Ghostscript not found.');
  });

  // ── FAILURE state ──────────────────────────────────────────────────────
  it('stops polling and sets error on FAILURE state', async () => {
    mockGetStatus.mockResolvedValueOnce({
      task_id: 'task-5',
      state: 'FAILURE',
      error: 'Worker crashed.',
    });

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useTaskPolling({ taskId: 'task-5', intervalMs: 500, onError })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toBe('Worker crashed.');
    expect(onError).toHaveBeenCalledWith('Worker crashed.');
  });

  // ── network error ──────────────────────────────────────────────────────
  it('stops polling and sets error on network/API exception', async () => {
    mockGetStatus.mockRejectedValueOnce(new Error('Network error.'));

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useTaskPolling({ taskId: 'task-6', intervalMs: 500, onError })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.isPolling).toBe(false);
    expect(result.current.error).toBe('Network error.');
    expect(onError).toHaveBeenCalledWith('Network error.');
  });

  // ── manual stopPolling ─────────────────────────────────────────────────
  it('stopPolling immediately halts further requests', async () => {
    mockGetStatus.mockResolvedValue({ task_id: 'task-7', state: 'PROCESSING' });

    const { result } = renderHook(() =>
      useTaskPolling({ taskId: 'task-7', intervalMs: 500 })
    );

    // Let one poll happen
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    act(() => {
      result.current.stopPolling();
    });

    const callsAfterStop = mockGetStatus.mock.calls.length;

    // Advance time — no new calls should happen
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.isPolling).toBe(false);
    expect(mockGetStatus.mock.calls.length).toBe(callsAfterStop);
  });

  // ── taskId changes ─────────────────────────────────────────────────────
  it('resets state and restarts polling when taskId changes', async () => {
    mockGetStatus.mockResolvedValue({ task_id: 'task-new', state: 'PENDING' });

    const { result, rerender } = renderHook(
      ({ taskId }: { taskId: string | null }) =>
        useTaskPolling({ taskId, intervalMs: 500 }),
      { initialProps: { taskId: null as string | null } }
    );

    expect(result.current.isPolling).toBe(false);

    // Provide a task id
    rerender({ taskId: 'task-new' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(result.current.isPolling).toBe(true);
    expect(mockGetStatus).toHaveBeenCalledWith('task-new');
  });

  // ── FAILURE with missing error message ────────────────────────────────
  it('falls back to default error message when FAILURE has no error field', async () => {
    mockGetStatus.mockResolvedValueOnce({ task_id: 'task-8', state: 'FAILURE' });

    const { result } = renderHook(() =>
      useTaskPolling({ taskId: 'task-8', intervalMs: 500 })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.error).toBe('Processing failed. Please try again.');
  });
});
