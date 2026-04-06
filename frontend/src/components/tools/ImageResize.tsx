import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Scaling } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { useConfig } from '@/hooks/useConfig';

export default function ImageResize() {
  const { t } = useTranslation();
  const { limits } = useConfig();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [quality, setQuality] = useState(85);
  const [lockAspect, setLockAspect] = useState(true);

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
    endpoint: '/image/resize',
    maxSizeMB: limits.image,
    acceptedTypes: ['png', 'jpg', 'jpeg', 'webp'],
    extraData: {
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      quality: quality.toString(),
    },
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
    if (!width && !height) return;
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setWidth('');
    setHeight('');
  };

  const dimensionValid = width || height;

  const schema = generateToolSchema({
    name: t('tools.imageResize.title'),
    description: t('tools.imageResize.description'),
    url: `${window.location.origin}/tools/image-resize`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.imageResize.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.imageResize.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/image-resize`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-900/30">
            <Scaling className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="section-heading">{t('tools.imageResize.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.imageResize.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

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
              maxSizeMB={limits.image}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel="Images (PNG, JPG, WebP)"
            />

            {file && !isUploading && (
              <>
                {/* Dimensions */}
                <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('tools.imageResize.dimensions')}
                    </span>
                    <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={lockAspect}
                        onChange={(e) => setLockAspect(e.target.checked)}
                        className="accent-primary-600"
                      />
                      {t('tools.imageResize.lockAspect')}
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <div>
                      <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                        {t('tools.imageResize.width')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        placeholder={t('tools.imageResize.widthPlaceholder')}
                        value={width}
                        onChange={(e) => {
                          setWidth(e.target.value);
                          if (lockAspect) setHeight('');
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
                        {t('tools.imageResize.height')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        placeholder={t('tools.imageResize.heightPlaceholder')}
                        value={height}
                        onChange={(e) => {
                          setHeight(e.target.value);
                          if (lockAspect) setWidth('');
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      />
                    </div>
                  </div>
                  {lockAspect && (
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                      {t('tools.imageResize.aspectHint')}
                    </p>
                  )}
                </div>

                {/* Quality Slider */}
                <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <label className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span>{t('tools.imageResize.quality')}</span>
                    <span className="text-primary-600">{quality}%</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-primary-600"
                  />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!dimensionValid}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('tools.imageResize.shortDesc')}
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
