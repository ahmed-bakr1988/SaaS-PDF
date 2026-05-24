import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ImageIcon } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

type ColorMode = 'color' | 'binary';

export default function ImageToSvg() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [colorMode, setColorMode] = useState<ColorMode>('color');

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
    endpoint: '/image/to-svg',
    maxSizeMB: 10,
    acceptedTypes: ['png', 'jpg', 'jpeg', 'webp'],
    extraData: { color_mode: colorMode },
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

  const modes: { value: ColorMode; label: string }[] = [
    { value: 'color', label: t('tools.imageToSvg.colorMode') },
    { value: 'binary', label: t('tools.imageToSvg.binaryMode') },
  ];

  const schema = generateToolSchema({
    name: t('tools.imageToSvg.title'),
    description: t('tools.imageToSvg.description'),
    url: `${window.location.origin}/tools/image-to-svg`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.imageToSvg.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.imageToSvg.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/image-to-svg`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <ImageIcon className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="section-heading">{t('tools.imageToSvg.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.imageToSvg.description')}</p>
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
              maxSizeMB={10}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel="Images (PNG, JPG, WebP)"
            />

            {file && !isUploading && (
              <>
                {/* Color Mode Selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t('tools.imageToSvg.modeLabel')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {modes.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setColorMode(m.value)}
                        className={`rounded-xl p-3 text-center ring-1 transition-all ${
                          colorMode === m.value
                            ? 'bg-primary-50 ring-primary-300 text-primary-700 font-semibold'
                            : 'bg-white ring-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleUpload} className="btn-primary w-full">
                  {t('tools.imageToSvg.shortDesc')}
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
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
              <p className="text-sm text-red-700">{taskError}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.startOver')}
            </button>
          </div>
        )}      </div>
    </>
  );
}
