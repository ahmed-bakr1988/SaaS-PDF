import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ListOrdered } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';

type Position = 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';

export default function AddPageNumbers() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [position, setPosition] = useState<Position>('bottom-center');
  const [startNumber, setStartNumber] = useState(1);

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
    endpoint: '/pdf-tools/page-numbers',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: { position, start_number: startNumber.toString() },
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

  const positions: { value: Position; label: string }[] = [
    { value: 'bottom-center', label: t('tools.pageNumbers.bottomCenter') },
    { value: 'bottom-right', label: t('tools.pageNumbers.bottomRight') },
    { value: 'bottom-left', label: t('tools.pageNumbers.bottomLeft') },
    { value: 'top-center', label: t('tools.pageNumbers.topCenter') },
    { value: 'top-right', label: t('tools.pageNumbers.topRight') },
    { value: 'top-left', label: t('tools.pageNumbers.topLeft') },
  ];

  const schema = generateToolSchema({
    name: t('tools.pageNumbers.title'),
    description: t('tools.pageNumbers.description'),
    url: `${window.location.origin}/tools/page-numbers`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.pageNumbers.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.pageNumbers.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/page-numbers`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
            <ListOrdered className="h-8 w-8 text-sky-600" />
          </div>
          <h1 className="section-heading">{t('tools.pageNumbers.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.pageNumbers.description')}</p>
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

            {file && !isUploading && (
              <>
                {/* Position Selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t('tools.pageNumbers.position')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {positions.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPosition(p.value)}
                        className={`rounded-lg p-2 text-center text-xs ring-1 transition-all ${
                          position === p.value
                            ? 'bg-primary-50 ring-primary-300 text-primary-700 font-semibold'
                            : 'bg-white ring-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Number */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {t('tools.pageNumbers.startNumber')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(1, Number(e.target.value)))}
                    className="input-field w-32"
                  />
                </div>

                <button onClick={handleUpload} className="btn-primary w-full">
                  {t('tools.pageNumbers.shortDesc')}
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
