import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Code } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';

export default function HtmlToPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint: '/convert/html-to-pdf',
    maxSizeMB: 10,
    acceptedTypes: ['html', 'htm'],
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

  const handleReset = () => { reset(); setPhase('upload'); };

  const schema = generateToolSchema({
    name: t('tools.htmlToPdf.title'),
    description: t('tools.htmlToPdf.description'),
    url: `${window.location.origin}/tools/html-to-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.htmlToPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.htmlToPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/html-to-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/30">
            <Code className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
          <h1 className="section-heading">{t('tools.htmlToPdf.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.htmlToPdf.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile} file={file}
              accept={{ 'text/html': ['.html', '.htm'] }}
              maxSizeMB={10} isUploading={isUploading}
              uploadProgress={uploadProgress} error={uploadError}
              onReset={handleReset} acceptLabel="HTML (.html, .htm)"
            />
            {file && !isUploading && (
              <button onClick={handleUpload} className="btn-primary w-full">
                {t('tools.htmlToPdf.shortDesc')}
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
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{taskError}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}
