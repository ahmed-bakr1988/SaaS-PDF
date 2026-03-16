import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { FileText } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import api, { type TaskResponse } from '@/services/api';

export default function PdfMetadata() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ title: '', author: '', subject: '', keywords: '', creator: '' });

  const { status, result, error: taskError } = useTaskPolling({
    taskId, onComplete: () => setPhase('done'), onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => { if (storeFile) { setFile(storeFile); clearStoreFile(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    if (!file) return;
    setError(null); setPhase('processing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(meta).forEach(([k, v]) => { if (v.trim()) fd.append(k, v.trim()); });
      const res = await api.post<TaskResponse>('/pdf-tools/metadata', fd);
      setTaskId(res.data.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit metadata.');
      setPhase('done');
    }
  };

  const handleReset = () => { setPhase('upload'); setFile(null); setTaskId(null); setError(null); setMeta({ title: '', author: '', subject: '', keywords: '', creator: '' }); };

  const schema = generateToolSchema({ name: t('tools.pdfMetadata.title'), description: t('tools.pdfMetadata.description'), url: `${window.location.origin}/tools/pdf-metadata` });

  const fields = ['title', 'author', 'subject', 'keywords', 'creator'] as const;
  const fieldLabelKeys: Record<string, string> = { title: 'titleField', author: 'author', subject: 'subject', keywords: 'keywords', creator: 'creator' };

  return (
    <>
      <Helmet>
        <title>{t('tools.pdfMetadata.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.pdfMetadata.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/pdf-metadata`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
            <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="section-heading">{t('tools.pdfMetadata.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.pdfMetadata.description')}</p>
        </div>
        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />
        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader onFileSelect={setFile} file={file} accept={{ 'application/pdf': ['.pdf'] }} maxSizeMB={20} acceptLabel="PDF (.pdf)" />
            {file && (
              <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 space-y-3">
                {fields.map((f) => (
                  <div key={f}>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t(`tools.pdfMetadata.${fieldLabelKeys[f]}`)}</label>
                    <input type="text" value={meta[f]} onChange={(e) => setMeta((m) => ({ ...m, [f]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      placeholder={t(`tools.pdfMetadata.${f}Placeholder`)} />
                  </div>
                ))}
              </div>
            )}
            {file && <button onClick={handleUpload} className="btn-primary w-full">{t('tools.pdfMetadata.shortDesc')}</button>}
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
        )}
        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}
