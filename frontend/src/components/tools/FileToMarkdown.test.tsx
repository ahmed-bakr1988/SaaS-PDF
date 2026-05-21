import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it, vi } from 'vitest';
import { useState, useEffect } from 'react';
import FileToMarkdown from './FileToMarkdown';

// Mock components
vi.mock('@/components/layout/AdSlot', () => ({
  default: () => null,
}));

vi.mock('@/components/shared/SignUpToDownloadModal', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="signup-modal">
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

// We need helper state that we can access outside the mock or update inside the test
let mockFileState: File | null = null;
let mockTaskIdState: string | null = null;
let triggerSelectFile: (f: File | null) => void = () => {};
let triggerStartUpload: () => Promise<string | null> = async () => null;

vi.mock('@/hooks/useFileUpload', () => {
  return {
    useFileUpload: vi.fn(() => {
      const [file, setFile] = useState<File | null>(mockFileState);
      const [taskId, setTaskId] = useState<string | null>(mockTaskIdState);

      useEffect(() => {
        triggerSelectFile = (f: File | null) => {
          mockFileState = f;
          setFile(f);
        };
        triggerStartUpload = async () => {
          mockTaskIdState = 'mock-task-id';
          setTaskId('mock-task-id');
          return 'mock-task-id';
        };
      }, []);

      return {
        file,
        uploadProgress: 0,
        isUploading: false,
        taskId,
        error: null,
        selectFile: (f: File | null) => {
          triggerSelectFile(f);
        },
        startUpload: triggerStartUpload,
        reset: () => {
          mockFileState = null;
          mockTaskIdState = null;
          setFile(null);
          setTaskId(null);
        },
      };
    }),
  };
});

vi.mock('@/hooks/useTaskPolling', () => {
  return {
    useTaskPolling: vi.fn(({ taskId, onComplete }) => {
      useEffect(() => {
        if (taskId) {
          onComplete({
            status: 'completed',
            text: '# Mocked Markdown Content\nWith some text.',
            metrics: {
              original_size_bytes: 1000,
              output_size_bytes: 500,
              char_count: 30,
              token_estimate: 7,
              token_reduction_pct: 50,
              estimated_cost_saved_usd: 0.05,
              noise_removed: ['HTML tags'],
              ai_readability_score: 95,
              conversion_method: 'Structured Markdown'
            },
            chunks: [
              { index: 0, text: '# Mocked Markdown Content', char_count: 25, token_estimate: 5 },
              { index: 1, text: 'With some text.', char_count: 15, token_estimate: 3 }
            ],
            prompt: 'System: You are an expert assistant.\nContext:\n# Mocked Markdown Content\nWith some text.'
          });
        }
      }, [taskId, onComplete]);

      return {
        status: taskId ? 'completed' : 'idle',
        result: taskId ? {
          status: 'completed',
          text: '# Mocked Markdown Content\nWith some text.',
          download_url: '/api/download/mock-task-id',
          metrics: {
            original_size_bytes: 1000,
            output_size_bytes: 500,
            char_count: 30,
            token_estimate: 7,
            token_reduction_pct: 50,
            estimated_cost_saved_usd: 0.05,
            noise_removed: ['HTML tags'],
            ai_readability_score: 95,
            conversion_method: 'Structured Markdown'
          },
          chunks: [
            { index: 0, text: '# Mocked Markdown Content', char_count: 25, token_estimate: 5 },
            { index: 1, text: 'With some text.', char_count: 15, token_estimate: 3 }
          ],
          prompt: 'System: You are an expert assistant.\nContext:\n# Mocked Markdown Content\nWith some text.'
        } : null,
        error: null,
      };
    }),
  };
});

// Mock config hook
vi.mock('@/hooks/useConfig', () => ({
  useConfig: () => ({
    limits: {
      pdf: 20,
      video: 50,
      word: 15,
    },
  }),
}));

// Mock auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (cb: any) => cb({ user: null }),
}));

describe('FileToMarkdown', () => {
  it('renders upload screen and handles custom file input', async () => {
    // Reset state before rendering
    mockFileState = null;
    mockTaskIdState = null;

    render(
      <HelmetProvider>
        <FileToMarkdown />
      </HelmetProvider>
    );

    // Check title/header elements
    expect(screen.getByText('AI Context & Markdown Engine')).toBeTruthy();
    expect(screen.getByText('Add File')).toBeTruthy();
    expect(screen.getByText('Google Drive')).toBeTruthy();
    expect(screen.getByText('Dropbox')).toBeTruthy();

    // Click Google Drive to open Cloud Import modal mockup
    fireEvent.click(screen.getByText('Google Drive'));
    expect(screen.getByText('Cloud Storage Import')).toBeTruthy();

    // Click on mock PDF file to import
    fireEvent.click(screen.getByText('Annual_Report_2026.pdf (12.4 MB)'));

    // Wait for step transitions to review page
    await waitFor(() => {
      expect(screen.getByText('Configure Processing Options')).toBeTruthy();
    });

    // Check file metadata displayed
    expect(screen.getAllByText('Annual_Report_2026.pdf').length).toBeGreaterThan(0);

    // Check toggles exist
    expect(screen.getByText('Enable PII Shield')).toBeTruthy();
    expect(screen.getByText('Semantic RAG Chunking')).toBeTruthy();

    // Start optimization & extraction
    fireEvent.click(screen.getByText('Start Extraction & Optimization'));

    // It should transition and automatically complete due to useTaskPolling mock
    await waitFor(() => {
      expect(screen.getByText('Markdown Content')).toBeTruthy();
    });

    // Check tabs
    expect(screen.getByText('Markdown Content')).toBeTruthy();
    expect(screen.getByText('RAG Chunks (2)')).toBeTruthy();
    expect(screen.getByText('AI Prompt Context')).toBeTruthy();

    // Check metrics
    expect(screen.getByText('AI Token Metrics')).toBeTruthy();
    expect(screen.getByText('AI Readability Score')).toBeTruthy();
    expect(screen.getByText('Noise Elements Cleansed')).toBeTruthy();
  });
});
