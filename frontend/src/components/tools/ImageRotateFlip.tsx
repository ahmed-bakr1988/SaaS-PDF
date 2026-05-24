import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { RotateCw } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { toast } from 'sonner';
import api, { type TaskResponse } from '@/services/api';

export default function ImageRotateFlip() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

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
      fd.append('rotation', String(rotation));
      fd.append('flip_horizontal', String(flipH));
      fd.append('flip_vertical', String(flipV));
      const res = await api.post<TaskResponse>('/image/rotate-flip', fd);
      setTaskId(res.data.task_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.errors.processingFailed');
      setError(msg);
      toast.error(msg);
      setPhase('done');
    }
  };

  const handleReset = () => { setPhase('upload'); setFile(null); setTaskId(null); setError(null); setRotation(0); setFlipH(false); setFlipV(false); };

  const schema = generateToolSchema({ name: t('tools.imageRotateFlip.title'), description: t('tools.imageRotateFlip.description'), url: `${window.location.origin}/tools/image-rotate-flip` });

  return (
    <>
      <Helmet>
        <title>{t('tools.imageRotateFlip.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.imageRotateFlip.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/image-rotate-flip`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-900/30">
            <RotateCw className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h1 className="section-heading">{t('tools.imageRotateFlip.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.imageRotateFlip.description')}</p>
        </div>        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader onFileSelect={setFile} file={file}
              accept={{ 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] }}
              maxSizeMB={10} acceptLabel="Image (.png, .jpg, .webp)" />
            {file && (
              <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('tools.imageRotateFlip.rotationLabel')}</label>
                  <select value={rotation} onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    <option value={0}>0°</option>
                    <option value={90}>90°</option>
                    <option value={180}>180°</option>
                    <option value={270}>270°</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={flipH} onChange={(e) => setFlipH(e.target.checked)} className="rounded" />
                    {t('tools.imageRotateFlip.flipHorizontal')}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={flipV} onChange={(e) => setFlipV(e.target.checked)} className="rounded" />
                    {t('tools.imageRotateFlip.flipVertical')}
                  </label>
                </div>
              </div>
            )}
            {file && <button onClick={handleUpload} className="btn-primary w-full">{t('tools.imageRotateFlip.shortDesc')}</button>}
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
