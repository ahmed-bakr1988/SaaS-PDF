import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Layers } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { toast } from 'sonner';
import { uploadFiles } from '@/services/api';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

export default function MergePdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: () => setPhase('done'),
    onError: () => setPhase('done'),
  });

  // Accept file from homepage smart upload
  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => {
    if (storeFile) {
      setFiles((prev) => [...prev, storeFile]);
      clearStoreFile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilesSelect = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles).filter(
      (f) => f.type === 'application/pdf'
    );
    if (fileArray.length === 0) {
      setError(t('tools.mergePdf.invalidFiles'));
      return;
    }
    setFiles((prev) => [...prev, ...fileArray]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length < 2) {
      setError(t('tools.mergePdf.minFiles'));
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const data = await uploadFiles('/pdf-tools/merge', files, 'files');
      setTaskId(data.task_id);
      setPhase('processing');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.errors.uploadFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setPhase('upload');
    setTaskId(null);
    setError(null);
    setUploadProgress(0);
  };

  const schema = generateToolSchema({
    name: t('tools.mergePdf.title'),
    description: t('tools.mergePdf.description'),
    url: `${window.location.origin}/tools/merge-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.mergePdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.mergePdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/merge-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
            <Layers className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="section-heading">{t('tools.mergePdf.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.mergePdf.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="space-y-4">
            {/* Drop zone for adding files */}
            <div
              className="upload-zone cursor-pointer"
              onClick={() => document.getElementById('merge-file-input')?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleFilesSelect(e.dataTransfer.files);
              }}
            >
              <input
                id="merge-file-input"
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFilesSelect(e.target.files);
                  e.target.value = '';
                }}
              />
              <Layers className="mb-4 h-12 w-12 text-slate-400" />
              <p className="mb-2 text-base font-medium text-slate-700">
                {t('common.dragDrop')}
              </p>
              <p className="text-sm text-slate-500">PDF (.pdf)</p>
              <p className="mt-1 text-xs text-slate-400">
                {t('common.maxSize', { size: 20 })}
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between rounded-lg bg-primary-50 p-3 ring-1 ring-primary-200"
                  >
                    <span className="truncate text-sm font-medium text-slate-900">
                      {idx + 1}. {f.name}
                    </span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="ml-2 text-xs text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <p className="text-sm text-slate-500">
                  {files.length} {t('tools.mergePdf.filesSelected')}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {files.length >= 2 && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="btn-primary w-full"
              >
                {isUploading ? t('common.processing') : t('tools.mergePdf.shortDesc')}
              </button>
            )}
          </div>
        )}

        {phase === 'processing' && !result && (
          <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />
        )}

        {phase === 'done' && result && result.status === 'completed' && (
          <DownloadButton result={result} onStartOver={handleReset} />
        )}

        {phase === 'done' && taskError && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
              <p className="text-sm text-red-700">{taskError}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.startOver')}
            </button>
          </div>
        )}

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}
