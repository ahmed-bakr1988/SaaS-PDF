import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Droplets } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

export default function WatermarkPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(30);

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
    endpoint: '/pdf-tools/watermark',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: { text, opacity: (opacity / 100).toString() },
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
    name: t('tools.watermarkPdf.title'),
    description: t('tools.watermarkPdf.description'),
    url: `${window.location.origin}/tools/watermark-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.watermarkPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.watermarkPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/watermark-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-100">
            <Droplets className="h-8 w-8 text-cyan-600" />
          </div>
          <h1 className="section-heading">{t('tools.watermarkPdf.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.watermarkPdf.description')}</p>
        </div>
        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile}
              file={file}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSizeMB={20}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel="PDF (.pdf)"
            />

            {file && !isUploading && (
              <>
                {/* Watermark Text */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {t('tools.watermarkPdf.text')}
                  </label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={50}
                    className="input-field w-full"
                    placeholder={t('tools.watermarkPdf.textPlaceholder')}
                  />
                </div>

                {/* Opacity Slider */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {t('tools.watermarkPdf.opacity')}: {opacity}%
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-cyan-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{t('tools.watermarkPdf.light')}</span>
                    <span>{t('tools.watermarkPdf.heavy')}</span>
                  </div>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!text.trim()}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {t('tools.watermarkPdf.shortDesc')}
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
