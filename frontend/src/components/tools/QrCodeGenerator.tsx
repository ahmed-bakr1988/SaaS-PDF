import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { QrCode } from 'lucide-react';
import ProgressBar from '@/components/shared/ProgressBar';
import AdSlot from '@/components/layout/AdSlot';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { toast } from 'sonner';
import api, { type TaskResponse, type TaskResult } from '@/services/api';
import { dispatchRatingPrompt } from '@/utils/ratingPrompt';

export default function QrCodeGenerator() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'input' | 'processing' | 'done'>('input');
  const [data, setData] = useState('');
  const [size, setSize] = useState(300);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: () => setPhase('done'),
    onError: () => setPhase('done'),
  });

  const handleGenerate = async () => {
    if (!data.trim()) return;
    setError(null);
    setPhase('processing');
    try {
      const res = await api.post<TaskResponse>('/qrcode/generate', { data: data.trim(), size });
      setTaskId(res.data.task_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.errors.processingFailed');
      setError(msg);
      toast.error(msg);
      setPhase('done');
    }
  };

  const handleReset = () => {
    setPhase('input');
    setData('');
    setSize(300);
    setTaskId(null);
    setError(null);
  };

  const downloadUrl = result?.download_url || null;

  const schema = generateToolSchema({
    name: t('tools.qrCode.title'),
    description: t('tools.qrCode.description'),
    url: `${window.location.origin}/tools/qr-code`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.qrCode.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.qrCode.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/qr-code`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
            <QrCode className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="section-heading">{t('tools.qrCode.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.qrCode.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'input' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('tools.qrCode.dataLabel')}
                </label>
                <textarea
                  value={data} onChange={(e) => setData(e.target.value)}
                  placeholder={t('tools.qrCode.dataPlaceholder')}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>{t('tools.qrCode.sizeLabel')}</span>
                  <span className="text-primary-600">{size}px</span>
                </label>
                <input type="range" min="100" max="1000" step="50" value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-primary-600" />
              </div>
            </div>
            <button onClick={handleGenerate} disabled={!data.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
              {t('tools.qrCode.shortDesc')}
            </button>
          </div>
        )}

        {phase === 'processing' && !result && (
          <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />
        )}

        {phase === 'done' && result && result.status === 'completed' && downloadUrl && (
          <div className="space-y-6 text-center">
            <div className="rounded-2xl bg-white p-8 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <img src={downloadUrl} alt="QR Code" loading="lazy" decoding="async" className="mx-auto max-w-[300px] rounded-lg" width={size} height={size} style={{aspectRatio:'1/1'}} />
            </div>
            <div className="flex gap-3">
              <a href={downloadUrl} download={result.filename || 'qrcode.png'}
                onClick={() => dispatchRatingPrompt('qr-code')}
                className="btn-primary flex-1">{t('common.download')}</a>
              <button onClick={handleReset} className="btn-secondary flex-1">{t('common.startOver')}</button>
            </div>
          </div>
        )}

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
