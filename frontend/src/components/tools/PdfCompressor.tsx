import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Minimize2 } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';

type Quality = 'low' | 'medium' | 'high';

export default function PdfCompressor() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [quality, setQuality] = useState<Quality>('medium');

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
    endpoint: '/compress/pdf',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: { quality },
  });

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: () => setPhase('done'),
    onError: () => setPhase('done'),
  });

  const handleUpload = async () => {
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
  };

  const qualityOptions: { value: Quality; label: string; desc: string }[] = [
    { value: 'low', label: t('tools.compressPdf.qualityLow'), desc: '72 DPI' },
    { value: 'medium', label: t('tools.compressPdf.qualityMedium'), desc: '150 DPI' },
    { value: 'high', label: t('tools.compressPdf.qualityHigh'), desc: '300 DPI' },
  ];

  const schema = generateToolSchema({
    name: t('tools.compressPdf.title'),
    description: t('tools.compressPdf.description'),
    url: `${window.location.origin}/tools/compress-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.compressPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.compressPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/compress-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
            <Minimize2 className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="section-heading">{t('tools.compressPdf.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.compressPdf.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

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

            {/* Quality Selector */}
            {file && !isUploading && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {qualityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setQuality(opt.value)}
                      className={`rounded-xl p-3 text-center ring-1 transition-all ${
                        quality === opt.value
                          ? 'bg-primary-50 ring-primary-300 text-primary-700'
                          : 'bg-white ring-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                <button onClick={handleUpload} className="btn-primary w-full">
                  {t('tools.compressPdf.shortDesc')}
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
