import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ScanText } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { useConfig } from '@/hooks/useConfig';

type OcrMode = 'image' | 'pdf';

const LANGUAGES = [
  { value: 'eng', label: 'English' },
  { value: 'ara', label: 'العربية' },
  { value: 'fra', label: 'Français' },
];

export default function OcrTool() {
  const { t } = useTranslation();
  const { limits } = useConfig();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [lang, setLang] = useState('eng');
  const [mode, setMode] = useState<OcrMode>('image');
  const [extractedText, setExtractedText] = useState('');

  const endpoint = mode === 'pdf' ? '/ocr/pdf' : '/ocr/image';
  const maxSize = mode === 'pdf' ? (limits.pdf ?? 20) : (limits.image ?? 10);

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint,
    maxSizeMB: maxSize,
    acceptedTypes: mode === 'pdf' ? ['pdf'] : ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp'],
    extraData: { lang },
  });

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: () => setPhase('done'),
    onError: () => setPhase('done'),
  });

  // Accept file from homepage smart upload
  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => {
    if (storeFile) {
      const ext = storeFile.name.split('.').pop()?.toLowerCase() ?? '';
      if (ext === 'pdf') setMode('pdf');
      else setMode('image');
      selectFile(storeFile);
      clearStoreFile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (result?.text) setExtractedText(result.text);
  }, [result]);

  const handleUpload = async () => {
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setExtractedText('');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(extractedText);
  };

  const acceptMap: Record<string, string[]> = mode === 'pdf'
    ? { 'application/pdf': ['.pdf'] }
    : {
        'image/png': ['.png'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/webp': ['.webp'],
        'image/tiff': ['.tiff'],
        'image/bmp': ['.bmp'],
      };

  const schema = generateToolSchema({
    name: t('tools.ocr.title'),
    description: t('tools.ocr.description'),
    url: `${window.location.origin}/tools/ocr`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.ocr.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.ocr.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/ocr`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <ScanText className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="section-heading">{t('tools.ocr.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.ocr.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="space-y-4">
            {/* Mode selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('tools.ocr.sourceType')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['image', 'pdf'] as OcrMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); reset(); }}
                    className={`rounded-xl p-3 text-center ring-1 transition-all ${
                      mode === m
                        ? 'bg-primary-50 ring-primary-300 text-primary-700 font-semibold dark:bg-primary-900/30 dark:ring-primary-700 dark:text-primary-300'
                        : 'bg-white ring-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:ring-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {m === 'image' ? t('tools.ocr.modeImage') : t('tools.ocr.modePdf')}
                  </button>
                ))}
              </div>
            </div>

            <FileUploader
              onFileSelect={selectFile}
              file={file}
              accept={acceptMap}
              maxSizeMB={maxSize}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel={mode === 'pdf' ? 'PDF' : 'Images (PNG, JPG, WebP, TIFF, BMP)'}
            />

            {file && !isUploading && (
              <>
                {/* Language selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('tools.ocr.language')}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.value}
                        onClick={() => setLang(l.value)}
                        className={`rounded-xl p-3 text-center ring-1 transition-all ${
                          lang === l.value
                            ? 'bg-primary-50 ring-primary-300 text-primary-700 font-semibold dark:bg-primary-900/30 dark:ring-primary-700 dark:text-primary-300'
                            : 'bg-white ring-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:ring-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleUpload}
                  className="btn-primary w-full"
                >
                  {t('tools.ocr.extract')}
                </button>
              </>
            )}
          </div>
        )}

        {phase === 'processing' && (
          <div className="space-y-4">
            <ProgressBar
              state={status?.state || 'PENDING'}
              message={status?.progress}
            />
            {taskError && (
              <div className="rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {taskError}
              </div>
            )}
          </div>
        )}

        {phase === 'done' && result?.status === 'completed' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
              <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
                {t('tools.ocr.charsExtracted', { count: result.char_count ?? 0 })}
              </p>
              <textarea
                readOnly
                value={extractedText}
                rows={12}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <div className="mt-3 flex gap-3">
                <button onClick={handleCopyText} className="btn-secondary flex-1">
                  {t('tools.ocr.copyText')}
                </button>
              </div>
            </div>
            {result.download_url && (
              <DownloadButton result={result} onStartOver={handleReset} />
            )}
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.processAnother')}
            </button>
          </div>
        )}

        {phase === 'done' && result?.status === 'failed' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {result.error || t('common.genericError')}
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.tryAgain')}
            </button>
          </div>
        )}

        <AdSlot slot="bottom-banner" format="horizontal" className="mt-6" />
      </div>
    </>
  );
}
