import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Crop } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { toast } from 'sonner';
import api, { type TaskResponse } from '@/services/api';

export default function ImageCrop() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState({ left: 0, top: 0, right: 100, bottom: 100 });

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
      fd.append('left', String(coords.left));
      fd.append('top', String(coords.top));
      fd.append('right', String(coords.right));
      fd.append('bottom', String(coords.bottom));
      const res = await api.post<TaskResponse>('/image/crop', fd);
      setTaskId(res.data.task_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.errors.processingFailed');
      setError(msg);
      toast.error(msg);
      setPhase('done');
    }
  };

  const handleReset = () => { setPhase('upload'); setFile(null); setTaskId(null); setError(null); setCoords({ left: 0, top: 0, right: 100, bottom: 100 }); };

  const schema = generateToolSchema({ name: t('tools.imageCrop.title'), description: t('tools.imageCrop.description'), url: `${window.location.origin}/tools/image-crop` });

  return (
    <>
      <Helmet>
        <title>{t('tools.imageCrop.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.imageCrop.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/image-crop`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100 dark:bg-pink-900/30">
            <Crop className="h-8 w-8 text-pink-600 dark:text-pink-400" />
          </div>
          <h1 className="section-heading">{t('tools.imageCrop.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.imageCrop.description')}</p>
        </div>
        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />
        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader onFileSelect={setFile} file={file}
              accept={{ 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'] }}
              maxSizeMB={10} acceptLabel="Image (.png, .jpg, .webp)" />
            {file && (
              <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">{t('tools.imageCrop.coordsLabel')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['left', 'top', 'right', 'bottom'] as const).map((side) => (
                    <div key={side}>
                      <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{t(`tools.imageCrop.${side}`)}</label>
                      <input type="number" min={0} value={coords[side]} onChange={(e) => setCoords((c) => ({ ...c, [side]: Math.max(0, Number(e.target.value)) }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {file && <button onClick={handleUpload} className="btn-primary w-full">{t('tools.imageCrop.shortDesc')}</button>}
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
