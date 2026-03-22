import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Barcode } from 'lucide-react';
import ProgressBar from '@/components/shared/ProgressBar';
import AdSlot from '@/components/layout/AdSlot';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { toast } from 'sonner';
import api, { type TaskResponse } from '@/services/api';

const BARCODE_TYPES = ['code128', 'code39', 'ean13', 'ean8', 'upca', 'isbn13', 'isbn10', 'issn', 'pzn'] as const;

export default function BarcodeGenerator() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'input' | 'processing' | 'done'>('input');
  const [data, setData] = useState('');
  const [barcodeType, setBarcodeType] = useState('code128');
  const [format, setFormat] = useState('png');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { status, result, error: taskError } = useTaskPolling({
    taskId, onComplete: () => setPhase('done'), onError: () => setPhase('done'),
  });

  const handleGenerate = async () => {
    if (!data.trim()) return;
    setError(null); setPhase('processing');
    try {
      const res = await api.post<TaskResponse>('/barcode/generate', {
        data: data.trim(), barcode_type: barcodeType, format,
      });
      setTaskId(res.data.task_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.errors.processingFailed');
      setError(msg);
      toast.error(msg);
      setPhase('done');
    }
  };

  const handleReset = () => { setPhase('input'); setData(''); setBarcodeType('code128'); setFormat('png'); setTaskId(null); setError(null); };

  const downloadUrl = result?.download_url || null;

  const schema = generateToolSchema({ name: t('tools.barcode.title'), description: t('tools.barcode.description'), url: `${window.location.origin}/tools/barcode-generator` });

  return (
    <>
      <Helmet>
        <title>{t('tools.barcode.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.barcode.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/barcode-generator`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <Barcode className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="section-heading">{t('tools.barcode.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.barcode.description')}</p>
        </div>
        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />
        {phase === 'input' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('tools.barcode.dataLabel')}</label>
                <input type="text" value={data} onChange={(e) => setData(e.target.value)}
                  placeholder={t('tools.barcode.dataPlaceholder')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('tools.barcode.typeLabel')}</label>
                <select value={barcodeType} onChange={(e) => setBarcodeType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                  {BARCODE_TYPES.map((bt) => <option key={bt} value={bt}>{bt.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('tools.barcode.formatLabel')}</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                  <option value="png">PNG</option>
                  <option value="svg">SVG</option>
                </select>
              </div>
            </div>
            <button onClick={handleGenerate} disabled={!data.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
              {t('tools.barcode.shortDesc')}
            </button>
          </div>
        )}
        {phase === 'processing' && !result && <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />}
        {phase === 'done' && downloadUrl && (
          <div className="space-y-4 text-center">
            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <img src={downloadUrl} alt="Barcode" loading="lazy" decoding="async" className="mx-auto max-w-full" />
            </div>
            <div className="flex gap-3">
              <a href={downloadUrl} download className="btn-primary flex-1">{t('common.download')}</a>
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
