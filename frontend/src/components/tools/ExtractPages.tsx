import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { FileOutput } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

export default function ExtractPages() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [pages, setPages] = useState('');

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint: '/pdf-tools/extract-pages',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: { pages },
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
    if (!pages.trim()) return;
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => { reset(); setPhase('upload'); setPages(''); };

  const schema = generateToolSchema({
    name: t('tools.extractPages.title'),
    description: t('tools.extractPages.description'),
    url: `${window.location.origin}/tools/extract-pages`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.extractPages.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.extractPages.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/extract-pages`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <FileOutput className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="section-heading">{t('tools.extractPages.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.extractPages.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile} file={file}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSizeMB={20} isUploading={isUploading}
              uploadProgress={uploadProgress} error={uploadError}
              onReset={handleReset} acceptLabel="PDF (.pdf)"
            />
            {file && !isUploading && (
              <>
                <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('tools.extractPages.pagesLabel')}
                  </label>
                  <input
                    type="text" value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    placeholder={t('tools.extractPages.pagesPlaceholder')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {t('tools.extractPages.pagesHint')}
                  </p>
                </div>
                <button onClick={handleUpload} disabled={!pages.trim()}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                  {t('tools.extractPages.shortDesc')}
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
        )}

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}
