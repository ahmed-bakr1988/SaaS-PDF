import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Eraser } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { useConfig } from '@/hooks/useConfig';

export default function RemoveBackground() {
  const { t } = useTranslation();
  const { limits } = useConfig();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint: '/remove-bg',
    maxSizeMB: limits.image ?? 10,
    acceptedTypes: ['png', 'jpg', 'jpeg', 'webp'],
  });

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
  };

  const schema = generateToolSchema({
    name: t('tools.removeBg.title'),
    description: t('tools.removeBg.description'),
    url: `${window.location.origin}/tools/remove-background`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.removeBg.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.removeBg.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/remove-background`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fuchsia-100">
            <Eraser className="h-8 w-8 text-fuchsia-600" />
          </div>
          <h1 className="section-heading">{t('tools.removeBg.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.removeBg.description')}</p>
        </div>
        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile}
              file={file}
              accept={{
                'image/png': ['.png'],
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/webp': ['.webp'],
              }}
              maxSizeMB={limits.image ?? 10}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel="Images (PNG, JPG, WebP)"
            />

            {file && !isUploading && (
              <button onClick={handleUpload} className="btn-primary w-full">
                {t('tools.removeBg.remove')}
              </button>
            )}
          </div>
        )}

        {phase === 'processing' && (
          <div className="space-y-4">
            <ProgressBar
              state={status?.state || 'PENDING'}
              message={status?.progress}
            />
            {taskError && (
              <div className="rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {taskError}
              </div>
            )}
          </div>
        )}

        {phase === 'done' && result?.status === 'completed' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20">
              <p className="mb-4 text-green-700 dark:text-green-400">
                {t('tools.removeBg.success')}
              </p>
            </div>
            <DownloadButton result={result} onStartOver={handleReset} />
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.processAnother')}
            </button>
          </div>
        )}

        {phase === 'done' && result?.status === 'failed' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {result.error || t('common.genericError')}
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.tryAgain')}
            </button>
          </div>
        )}

        {phase === 'done' && !result && taskError && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {taskError}
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.tryAgain')}
            </button>
          </div>
        )}      </div>
    </>
  );
}
