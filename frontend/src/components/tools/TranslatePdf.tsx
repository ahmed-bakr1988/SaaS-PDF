import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Languages, ShieldCheck, Sparkles } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { dispatchRatingPrompt } from '@/utils/ratingPrompt';

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

const getLanguageLabel = (value: string) => {
  if (!value || value === 'auto') {
    return null;
  }

  return LANGUAGES.find((language) => language.value === value)?.label ?? value;
};

export default function TranslatePdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [translation, setTranslation] = useState('');
  const [provider, setProvider] = useState('');
  const [detectedSourceLanguage, setDetectedSourceLanguage] = useState('');

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint: '/pdf-ai/translate',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: { target_language: targetLang, source_language: sourceLang },
  });

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: (r) => {
      setPhase('done');
      setTranslation(r.translation || '');
      setProvider(r.provider || '');
      setDetectedSourceLanguage(r.detected_source_language || '');
      dispatchRatingPrompt('translate-pdf');
    },
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => {
    if (storeFile) { selectFile(storeFile); clearStoreFile(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setSourceLang('auto');
    setTargetLang('en');
    setTranslation('');
    setProvider('');
    setDetectedSourceLanguage('');
  };

  const resolvedDetectedLanguage = getLanguageLabel(detectedSourceLanguage) || getLanguageLabel(sourceLang);

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
                </div>
                <button onClick={handleUpload} className="btn-primary w-full">
                  {t('tools.translatePdf.shortDesc')}
                </button>
              </>
            )}
          </div>
        )}

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

        {phase === 'done' && translation && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('tools.translatePdf.sourceDetected')}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {resolvedDetectedLanguage || t('tools.translatePdf.autoDetect')}
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t('tools.translatePdf.translationEngine')}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {provider || 'auto'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('tools.translatePdf.resultTitle')}
              </h3>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                {translation}
              </div>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}

        {phase === 'done' && taskError && !translation && (
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
