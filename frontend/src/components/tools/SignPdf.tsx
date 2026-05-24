import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { PenTool } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { toast } from 'sonner';
import api, { type TaskResponse } from '@/services/api';

export default function SignPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sigFile, setSigFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { status, result, error: taskError } = useTaskPolling({
    taskId, onComplete: () => setPhase('done'), onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => { if (storeFile) { setPdfFile(storeFile); clearStoreFile(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    if (!pdfFile || !sigFile) return;
    setError(null);
    setPhase('processing');
    try {
      const fd = new FormData();
      fd.append('file', pdfFile);
      fd.append('signature', sigFile);
      fd.append('page', String(page));
      const res = await api.post<TaskResponse>('/convert/sign', fd);
      setTaskId(res.data.task_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.errors.processingFailed');
      setError(msg);
      toast.error(msg);
      setPhase('done');
    }
  };

  const handleReset = () => {
    setPhase('upload'); setPdfFile(null); setSigFile(null);
    setTaskId(null); setError(null); setPage(1);
  };

  const schema = generateToolSchema({
    name: t('tools.signPdf.title'), description: t('tools.signPdf.description'),
    url: `${window.location.origin}/tools/sign-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.signPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.signPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/sign-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
            <PenTool className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="section-heading">{t('tools.signPdf.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.signPdf.description')}</p>
        </div>        {phase === 'upload' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('tools.signPdf.pdfLabel')}
                </label>
                <FileUploader onFileSelect={setPdfFile} file={pdfFile}
                  accept={{ 'application/pdf': ['.pdf'] }} maxSizeMB={20}
                  acceptLabel="PDF (.pdf)" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('tools.signPdf.signatureLabel')}
                </label>
                <FileUploader onFileSelect={setSigFile} file={sigFile}
                  accept={{ 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }} maxSizeMB={5}
                  acceptLabel="Image (.png, .jpg)" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('tools.signPdf.pageLabel')}
                </label>
                <input type="number" min={1} value={page} onChange={(e) => setPage(Math.max(1, Number(e.target.value)))}
                  className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              </div>
            </div>
            {pdfFile && sigFile && (
              <button onClick={handleUpload} className="btn-primary w-full">{t('tools.signPdf.shortDesc')}</button>
            )}
          </div>
        )}
        {phase === 'processing' && !result && <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />}
        {phase === 'done' && result && result.status === 'completed' && <DownloadButton result={result} onStartOver={handleReset} />}
        {phase === 'done' && (taskError || error) && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{taskError || error}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}      </div>
    </>
  );
}
