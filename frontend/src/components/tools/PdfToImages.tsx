import { useState } from 'react';
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

type OutputFormat = 'png' | 'jpg';

export default function PdfToImages() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [format, setFormat] = useState<OutputFormat>('png');
  const [dpi, setDpi] = useState(200);

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
    endpoint: '/pdf-tools/pdf-to-images',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: { format, dpi: dpi.toString() },
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

  const formats: { value: OutputFormat; label: string }[] = [
    { value: 'png', label: 'PNG' },
    { value: 'jpg', label: 'JPG' },
  ];

  const dpiOptions = [
    { value: 72, label: '72 DPI', desc: t('tools.pdfToImages.lowQuality') },
    { value: 150, label: '150 DPI', desc: t('tools.pdfToImages.mediumQuality') },
    { value: 200, label: '200 DPI', desc: t('tools.pdfToImages.highQuality') },
    { value: 300, label: '300 DPI', desc: t('tools.pdfToImages.bestQuality') },
  ];

  const schema = generateToolSchema({
    name: t('tools.pdfToImages.title'),
    description: t('tools.pdfToImages.description'),
    url: `${window.location.origin}/tools/pdf-to-images`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.pdfToImages.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.pdfToImages.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/pdf-to-images`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100">
            <ImageIcon className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="section-heading">{t('tools.pdfToImages.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.pdfToImages.description')}</p>
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
                {/* Format Selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t('tools.pdfToImages.outputFormat')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
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

                {/* DPI Selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t('tools.pdfToImages.quality')}
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {dpiOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDpi(opt.value)}
                        className={`rounded-xl p-3 text-center ring-1 transition-all ${
                          dpi === opt.value
                            ? 'bg-primary-50 ring-primary-300 text-primary-700'
                            : 'bg-white ring-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleUpload} className="btn-primary w-full">
                  {t('tools.pdfToImages.shortDesc')}
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
