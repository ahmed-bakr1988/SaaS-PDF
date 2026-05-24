import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Wrench } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

export default function RepairPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');

  const { file, uploadProgress, isUploading, taskId, error: uploadError, selectFile, startUpload, reset } =
    useFileUpload({ endpoint: '/pdf-tools/repair', maxSizeMB: 20, acceptedTypes: ['pdf'] });

  const { status, result, error: taskError } = useTaskPolling({
    taskId, onComplete: () => setPhase('done'), onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => { if (storeFile) { selectFile(storeFile); clearStoreFile(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => { const id = await startUpload(); if (id) setPhase('processing'); };
  const handleReset = () => { reset(); setPhase('upload'); };

  const schema = generateToolSchema({ name: t('tools.repairPdf.title'), description: t('tools.repairPdf.description'), url: `${window.location.origin}/tools/repair-pdf` });

  return (
    <>
      <Helmet>
        <title>{t('tools.repairPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.repairPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/repair-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
            <Wrench className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="section-heading">{t('tools.repairPdf.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.repairPdf.description')}</p>
        </div>        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader onFileSelect={selectFile} file={file} accept={{ 'application/pdf': ['.pdf'] }} maxSizeMB={20} acceptLabel="PDF (.pdf)" />
            {file && <button onClick={handleUpload} disabled={isUploading} className="btn-primary w-full">{t('tools.repairPdf.shortDesc')}</button>}
          </div>
        )}
        {phase === 'processing' && !result && <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />}
        {phase === 'done' && result && result.status === 'completed' && <DownloadButton result={result} onStartOver={handleReset} />}
        {phase === 'done' && (taskError || uploadError) && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{taskError || uploadError}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}      </div>
    </>
  );
}
