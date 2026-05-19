import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Copy, Check } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { useFileStore } from '@/stores/fileStore';
import { useConfig } from '@/hooks/useConfig';

const ACCEPTED_TYPES = [
  'pdf', 'doc', 'docx', 'html', 'htm', 'zip',
  'png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp',
  'mp4', 'webm', 'pptx', 'ppt', 'xlsx', 'xls',
  'txt', 'md', 'markdown', 'csv', 'json', 'xml', 'log',
];

const ACCEPT_MAP = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/html': ['.html', '.htm'],
  'text/plain': ['.txt', '.md', '.markdown', '.log'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/xml': ['.xml'],
  'application/zip': ['.zip'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tiff'],
  'image/bmp': ['.bmp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
};

export default function FileToMarkdown() {
  const { t } = useTranslation();
  const { limits } = useConfig();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [preview, setPreview] = useState('');
  const [copied, setCopied] = useState(false);

  const maxSize = Math.max(limits.pdf ?? 20, limits.video ?? 50, limits.word ?? 15);

  const {
    file,
    uploadProgress,
    isUploading,
    taskId,
    error: uploadError,
    selectFile,
    startUpload,
    reset,
  } = useFileUpload({
    endpoint: '/convert/to-markdown',
    maxSizeMB: maxSize,
    acceptedTypes: ACCEPTED_TYPES,
  });

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: (taskResult) => {
      setPreview(taskResult.text || '');
      setPhase('done');
    },
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);

  useEffect(() => {
    if (storeFile) {
      selectFile(storeFile);
      clearStoreFile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setPreview('');
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!preview) return;
    await navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/30">
            <FileText className="h-8 w-8 text-sky-600 dark:text-sky-300" />
          </div>
          <h1 className="section-heading">{t('tools.fileToMarkdown.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.fileToMarkdown.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="space-y-5">
            <FileUploader
              onFileSelect={selectFile}
              file={file}
              accept={ACCEPT_MAP}
              maxSizeMB={maxSize}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel={t('tools.fileToMarkdown.acceptLabel')}
            />

            {file && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <p className="font-medium text-slate-900 dark:text-white">{t('tools.fileToMarkdown.outputTitle')}</p>
                <p className="mt-1">{t('tools.fileToMarkdown.outputDesc')}</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {isUploading ? t('common.uploading') : t('tools.fileToMarkdown.convert')}
            </button>
          </div>
        )}

        {phase === 'processing' && (
          <ProgressBar
            state={status?.state || 'PENDING'}
            message={status?.progress || t('tools.fileToMarkdown.processing')}
          />
        )}

        {phase === 'done' && result?.status === 'completed' && (
          <div className="space-y-4">
            {preview && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t('tools.fileToMarkdown.preview')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('tools.fileToMarkdown.charCount', { count: result.char_count ?? preview.length })}
                    </p>
                  </div>
                  <button onClick={handleCopy} className="btn-secondary shrink-0">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={preview}
                  rows={14}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </div>
            )}

            <DownloadButton result={result} onStartOver={handleReset} />
          </div>
        )}

        {phase === 'done' && (taskError || result?.status === 'failed') && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {taskError || result?.user_message || result?.error || t('common.genericError')}
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.tryAgain')}
            </button>
          </div>
        )}

        <AdSlot slot="bottom-banner" format="horizontal" className="mt-6" />
      </div>
    </>
  );
}
