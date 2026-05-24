import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Minimize2 } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { useConfig } from '@/hooks/useConfig';

export default function CompressImage() {
  const { t } = useTranslation();
  const { limits } = useConfig();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [quality, setQuality] = useState(75);

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint: '/image/compress',
    maxSizeMB: limits.image,
    acceptedTypes: ['png', 'jpg', 'jpeg', 'webp'],
    extraData: { quality: quality.toString() },
  });

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: () => setPhase('done'),
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => {
    if (storeFile) { selectFile(storeFile); clearStoreFile(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => { reset(); setPhase('upload'); setQuality(75); };

  const schema = generateToolSchema({
    name: t('tools.compressImage.title'),
    description: t('tools.compressImage.description'),
    url: `${window.location.origin}/tools/compress-image`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.compressImage.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.compressImage.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/compress-image`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/30">
            <Minimize2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h1 className="section-heading">{t('tools.compressImage.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.compressImage.description')}</p>
        </div>
        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile} file={file}
              accept={{ 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] }}
              maxSizeMB={limits.image} isUploading={isUploading}
              uploadProgress={uploadProgress} error={uploadError}
              onReset={handleReset} acceptLabel="Images (PNG, JPG, WebP)"
            />
            {file && !isUploading && (
              <>
                <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <label className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span>{t('tools.compressImage.quality')}</span>
                    <span className="text-primary-600">{quality}%</span>
                  </label>
                  <input type="range" min="10" max="100" value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-primary-600" />
                </div>
                <button onClick={handleUpload} className="btn-primary w-full">
                  {t('tools.compressImage.shortDesc')}
                </button>
              </>
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
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{taskError}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}      </div>
    </>
  );
}
