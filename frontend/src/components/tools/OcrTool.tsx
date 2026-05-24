import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanText } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { useFileStore } from '@/stores/fileStore';
import { useConfig } from '@/hooks/useConfig';
import api from '@/services/apiClient';

type OcrMode = 'image' | 'pdf';

interface OcrLanguageOption {
  value: string;
  label: string;
}

export default function OcrTool() {
  const { t } = useTranslation();
  const { limits } = useConfig();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [lang, setLang] = useState('eng');
  const [mode, setMode] = useState<OcrMode>('image');
  const [extractedText, setExtractedText] = useState('');
  const [languages, setLanguages] = useState<OcrLanguageOption[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searchable, setSearchable] = useState(false);

  const endpoint = mode === 'pdf' ? '/ocr/pdf' : '/ocr/image';
  const maxSize = mode === 'pdf' ? (limits.pdf ?? 20) : (limits.image ?? 10);

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint,
    maxSizeMB: maxSize,
    acceptedTypes: mode === 'pdf' ? ['pdf'] : ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp'],
    extraData: { lang, ...(mode === 'pdf' && { searchable: String(searchable) }) },
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

  useEffect(() => {
    let cancelled = false;

    const loadLanguages = async () => {
      try {
        const response = await api.get<{ languages: Record<string, string> }>('/ocr/languages');
        if (cancelled) return;
        const nextLanguages = Object.entries(response.data.languages || {}).map(([value, label]) => ({ value, label }));
        setLanguages(nextLanguages);
        if (nextLanguages.length > 0 && !nextLanguages.some((entry) => entry.value === lang)) {
          setLang(nextLanguages[0].value);
        }
      } catch {
        if (!cancelled) {
          setLanguages([
            { value: 'eng', label: 'English' },
            { value: 'ara', label: 'Arabic' },
            { value: 'fra', label: 'French' },
          ]);
        }
      }
    };

    void loadLanguages();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!file || mode !== 'image') {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, mode]);

  const handleUpload = async () => {
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setExtractedText('');
    setSearchable(false);
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

  return (
    <>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <ScanText className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="section-heading">{t('tools.ocr.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.ocr.description')}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{t('tools.ocr.trustScans', 'Built for scanned files and photos')}</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{t('tools.ocr.trustAsync', 'Processed asynchronously')}</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{t('tools.ocr.trustDownload', 'Preview text and download full output')}</span>
          </div>
        </div>
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

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-white">{t('tools.ocr.bestResults', 'Best results')}</p>
              <p className="mt-1">{t('tools.ocr.bestResultsDesc', 'Use clean scans, readable contrast, and pick the closest document language for higher OCR accuracy.')}</p>
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

            {file && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{file.name}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('tools.ocr.fileSummary', '{{size}} MB max {{max}} MB', {
                        size: (file.size / (1024 * 1024)).toFixed(2),
                        max: maxSize,
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                    {mode === 'pdf' ? t('tools.ocr.modePdf') : t('tools.ocr.modeImage')}
                  </span>
                </div>
                {previewUrl && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    <img src={previewUrl} alt={file.name} className="max-h-56 w-full object-contain" />
                  </div>
                )}
              </div>
            )}

            {file && !isUploading && (
              <>
                {/* Language selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('tools.ocr.language')}
                  </label>
                  <select
                    value={lang}
                    onChange={(event) => setLang(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-primary-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-primary-500"
                  >
                    {languages.map((language) => (
                      <option key={language.value} value={language.value}>{language.label}</option>
                    ))}
                  </select>
                </div>

                {/* Searchable PDF toggle */}
                {mode === 'pdf' && (
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50">
                    <input
                      type="checkbox"
                      checked={searchable}
                      onChange={(e) => setSearchable(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {t('tools.ocr.searchablePdf', 'Create searchable PDF')}
                      </span>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t('tools.ocr.searchablePdfDesc', 'Embed invisible text layer so the PDF can be searched and copied. Takes longer but produces a more useful result.')}
                      </p>
                    </div>
                  </label>
                )}

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
              <p className="mb-4 text-xs text-green-700/80 dark:text-green-300/80">
                {t('tools.ocr.previewNote', 'This preview shows the extracted text directly on the page. Use the download button for the full OCR file.')}
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
        )}      </div>
    </>
  );
}
