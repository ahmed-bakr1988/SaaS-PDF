import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from './useFileUpload';

// ── mock the api module ────────────────────────────────────────────────────
vi.mock('@/services/api', () => ({
  uploadFile: vi.fn(),
}));

import { uploadFile } from '@/services/api';
const mockUpload = vi.mocked(uploadFile);

// ── helpers ────────────────────────────────────────────────────────────────
function makeFile(name: string, sizeBytes: number, type = 'application/pdf'): File {
  const buf = new Uint8Array(sizeBytes);
  return new File([buf], name, { type });
}

// ── tests ──────────────────────────────────────────────────────────────────
describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── initial state ──────────────────────────────────────────────────────
  it('starts with null file and no error', () => {
    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf' })
    );
    expect(result.current.file).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isUploading).toBe(false);
    expect(result.current.taskId).toBeNull();
    expect(result.current.uploadProgress).toBe(0);
  });

  // ── selectFile — type validation ───────────────────────────────────────
  it('selectFile: accepts a file when no type restriction set', () => {
    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf' })
    );
    const pdf = makeFile('doc.pdf', 100);
    act(() => {
      result.current.selectFile(pdf);
    });
    expect(result.current.file).toBe(pdf);
    expect(result.current.error).toBeNull();
  });

  it('selectFile: rejects wrong extension when acceptedTypes given', () => {
    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf', acceptedTypes: ['pdf'] })
    );
    act(() => {
      result.current.selectFile(makeFile('photo.jpg', 100));
    });
    expect(result.current.file).toBeNull();
    expect(result.current.error).toMatch(/invalid file type/i);
  });

  it('selectFile: accepts correct extension', () => {
    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf', acceptedTypes: ['pdf', 'docx'] })
    );
    const docx = makeFile('report.docx', 200);
    act(() => {
      result.current.selectFile(docx);
    });
    expect(result.current.file).toBe(docx);
    expect(result.current.error).toBeNull();
  });

  // ── selectFile — size validation ───────────────────────────────────────
  it('selectFile: rejects file exceeding maxSizeMB', () => {
    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf', maxSizeMB: 1 })
    );
    // 1.1 MB > 1 MB limit
    act(() => {
      result.current.selectFile(makeFile('big.pdf', 1.1 * 1024 * 1024));
    });
    expect(result.current.file).toBeNull();
    expect(result.current.error).toMatch(/too large/i);
  });

  it('selectFile: accepts file exactly at the size limit', () => {
    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf', maxSizeMB: 5 })
    );
    act(() => {
      result.current.selectFile(makeFile('ok.pdf', 5 * 1024 * 1024));
    });
    expect(result.current.file).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  // ── selectFile: clears previous error / taskId on next pick ───────────
  it('selectFile: clears previous error when new valid file selected', () => {
    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf', acceptedTypes: ['pdf'] })
    );
    // First pick — wrong type → sets error
    act(() => {
      result.current.selectFile(makeFile('bad.exe', 10));
    });
    expect(result.current.error).not.toBeNull();

    // Second pick — valid → error must clear
    act(() => {
      result.current.selectFile(makeFile('good.pdf', 10));
    });
    expect(result.current.error).toBeNull();
  });

  // ── startUpload — no file selected ────────────────────────────────────
  it('startUpload: returns null and sets error when no file selected', async () => {
    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf' })
    );
    let returnValue: string | null = 'initial';
    await act(async () => {
      returnValue = await result.current.startUpload();
    });
    expect(returnValue).toBeNull();
    expect(result.current.error).toMatch(/no file/i);
  });

  // ── startUpload — success ──────────────────────────────────────────────
  it('startUpload: sets taskId on success', async () => {
    mockUpload.mockResolvedValueOnce({
      task_id: 'abc-123',
      message: 'started',
    });

    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf', extraData: { quality: 'medium' } })
    );
    act(() => {
      result.current.selectFile(makeFile('doc.pdf', 500));
    });

    let taskId: string | null = null;
    await act(async () => {
      taskId = await result.current.startUpload();
    });

    expect(taskId).toBe('abc-123');
    expect(result.current.taskId).toBe('abc-123');
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockUpload).toHaveBeenCalledWith(
      '/compress/pdf',
      expect.any(File),
      { quality: 'medium' },
      expect.any(Function),
    );
  });

  // ── startUpload — API error ────────────────────────────────────────────
  it('startUpload: sets error message when API rejects', async () => {
    mockUpload.mockRejectedValueOnce(new Error('File too large.'));

    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf' })
    );
    act(() => {
      result.current.selectFile(makeFile('doc.pdf', 500));
    });

    await act(async () => {
      await result.current.startUpload();
    });

    expect(result.current.error).toBe('File too large.');
    expect(result.current.isUploading).toBe(false);
    expect(result.current.taskId).toBeNull();
  });

  // ── reset ──────────────────────────────────────────────────────────────
  it('reset: clears all state', async () => {
    mockUpload.mockResolvedValueOnce({ task_id: 'xyz', message: 'ok' });

    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf' })
    );
    act(() => {
      result.current.selectFile(makeFile('doc.pdf', 500));
    });
    await act(async () => {
      await result.current.startUpload();
    });
    expect(result.current.taskId).toBe('xyz');

    act(() => {
      result.current.reset();
    });
    expect(result.current.file).toBeNull();
    expect(result.current.taskId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.uploadProgress).toBe(0);
    expect(result.current.isUploading).toBe(false);
  });

  // ── progress callback ──────────────────────────────────────────────────
  it('startUpload: progress callback updates uploadProgress', async () => {
    mockUpload.mockImplementationOnce(async (_ep, _file, _extra, onProgress) => {
      onProgress?.(50);
      onProgress?.(100);
      return { task_id: 'prog-task', message: 'done' };
    });

    const { result } = renderHook(() =>
      useFileUpload({ endpoint: '/compress/pdf' })
    );
    act(() => {
      result.current.selectFile(makeFile('doc.pdf', 500));
    });
    await act(async () => {
      await result.current.startUpload();
    });
    // After completion the task id should be set
    expect(result.current.taskId).toBe('prog-task');
  });
});
