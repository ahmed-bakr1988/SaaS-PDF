import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ImageIcon } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

type OutputFormat = 'jpg' | 'png' | 'webp';

export default function ImageConverter() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [format, setFormat] = useState<OutputFormat>('jpg');
  const [quality, setQuality] = useState(85);

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
    endpoint: '/image/convert',
    maxSizeMB: 10,
    acceptedTypes: ['png', 'jpg', 'jpeg', 'webp'],
    extraData: { format, quality: quality.toString() },
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

  const formats: { value: OutputFormat; label: string }[] = [
    { value: 'jpg', label: 'JPG' },
    { value: 'png', label: 'PNG' },
    { value: 'webp', label: 'WebP' },
  ];

  const schema = generateToolSchema({
    name: t('tools.imageConvert.title'),
    description: t('tools.imageConvert.description'),
    url: `${window.location.origin}/tools/image-converter`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.imageConvert.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.imageConvert.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/image-converter`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100">
            <ImageIcon className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="section-heading">{t('tools.imageConvert.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.imageConvert.description')}</p>
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
              maxSizeMB={10}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel="Images (PNG, JPG, WebP)"
            />

            {file && !isUploading && (
              <>
                {/* Format Selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Convert to:
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                    {formats.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFormat(f.value)}
                        className={`rounded-xl p-3 text-center ring-1 transition-all ${
                          format === f.value
                            ? 'bg-primary-50 ring-primary-300 text-primary-700 font-semibold'
                            : 'bg-white ring-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality Slider (for lossy formats) */}
                {format !== 'png' && (
                  <div>
                    <label className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                      <span>Quality</span>
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
                )}

                <button onClick={handleUpload} className="btn-primary w-full">
                  {t('tools.imageConvert.shortDesc')}
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
        )}

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}
