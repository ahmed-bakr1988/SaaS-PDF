import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Languages, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AiModelSelector from '@/components/shared/AiModelSelector';
import TranslateModeSelector from '@/components/shared/TranslateModeSelector';
import type { TranslateMode } from '@/components/shared/TranslateModeSelector';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { dispatchRatingPrompt } from '@/utils/ratingPrompt';
import { estimateTranslatePdf } from '@/services/api';
import type { TaskResult, TranslateEstimateResponse } from '@/services/api';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'it', label: 'Italiano' },
];

export default function TranslatePdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'estimate' | 'processing' | 'done'>('upload');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedMode, setSelectedMode] = useState<TranslateMode>('text');
  const [estimate, setEstimate] = useState<TranslateEstimateResponse | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint: '/pdf-ai/translate',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: {
      target_language: targetLang,
      source_language: sourceLang,
      model_id: selectedModel,
      mode: selectedMode,
    },
  });

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: (r) => {
      setPhase('done');
      setTaskResult(r);
      dispatchRatingPrompt('translate-pdf');
    },
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => {
    if (storeFile) { selectFile(storeFile); clearStoreFile(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When a file is selected, run the estimate automatically
  const handleEstimate = async () => {
    if (!file) return;
    setEstimating(true);
    setEstimateError(null);
    try {
      const est = await estimateTranslatePdf(file);
      setEstimate(est);
      setSelectedMode(est.analysis.recommendation);
      setPhase('estimate');
    } catch (err) {
      setEstimateError(err instanceof Error ? err.message : 'Failed to analyze PDF.');
    } finally {
      setEstimating(false);
    }
  };

  const handleTranslate = async () => {
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setSourceLang('auto');
    setTargetLang('en');
    setSelectedModel('');
    setSelectedMode('text');
    setEstimate(null);
    setEstimateError(null);
    setTaskResult(null);
  };

  const schema = generateToolSchema({
    name: t('tools.translatePdf.title'),
    description: t('tools.translatePdf.description'),
    url: `${window.location.origin}/tools/translate-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.translatePdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.translatePdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/translate-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/30">
            <Languages className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="section-heading">{t('tools.translatePdf.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.translatePdf.description')}</p>
        </div>
        {/* ── Phase: Upload ─────────────────────────────────────── */}
        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile} file={file}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSizeMB={20} isUploading={isUploading || estimating}
              uploadProgress={uploadProgress} error={uploadError || estimateError}
              onReset={handleReset} acceptLabel="PDF (.pdf)"
            />
            {file && !isUploading && !estimating && (
              <>
                <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <div className="mb-4 flex items-start gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {t('tools.translatePdf.engineTitle')}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {t('tools.translatePdf.engineDescription')}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('tools.translatePdf.sourceLang')}
                      </label>
                      <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        <option value="auto">{t('tools.translatePdf.autoDetect')}</option>
                        {LANGUAGES.map((lang) => (
                          <option key={`source-${lang.value}`} value={lang.value}>{lang.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        {t('tools.translatePdf.targetLang')}
                      </label>
                      <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {LANGUAGES.map((lang) => (
                          <option key={lang.value} value={lang.value}>{lang.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <AiModelSelector value={selectedModel} onChange={setSelectedModel} />
                </div>
                <button onClick={handleEstimate} className="btn-primary w-full">
                  {t('tools.translatePdf.shortDesc')}
                </button>
              </>
            )}
            {estimating && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-white p-6 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t('tools.translatePdf.estimating')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Phase: Estimate / Mode Selection ──────────────────── */}
        {phase === 'estimate' && estimate && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <TranslateModeSelector
                estimate={estimate}
                value={selectedMode}
                onChange={setSelectedMode}
              />
            </div>
            <button
              onClick={handleTranslate}
              disabled={isUploading}
              className="btn-primary w-full"
            >
              {isUploading
                ? `${uploadProgress}%`
                : t('tools.translatePdf.translateWithMode', { mode: t(`tools.translatePdf.mode${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)}`) })}
            </button>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.startOver')}
            </button>
          </div>
        )}

        {/* ── Phase: Processing ─────────────────────────────────── */}
        {phase === 'processing' && !result && (
          <div className="space-y-4">
            <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />
            <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-purple-600 dark:text-purple-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('tools.translatePdf.processingHint')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase: Done (success) ─────────────────────────────── */}
        {phase === 'done' && taskResult?.download_url && (
          <DownloadButton result={taskResult} onStartOver={handleReset} />
        )}

        {/* ── Phase: Done (error) ───────────────────────────────── */}
        {phase === 'done' && taskError && !taskResult?.download_url && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{taskError}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}      </div>
    </>
  );
}
