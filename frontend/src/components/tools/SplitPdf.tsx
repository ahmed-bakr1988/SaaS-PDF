import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Scissors } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

type SplitMode = 'all' | 'range';

export default function SplitPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [mode, setMode] = useState<SplitMode>('all');
  const [pages, setPages] = useState('');
  const [validationError, setValidationError] = useState('');

  const {
    file,
    uploadProgress,
    isUploading,
    taskId,
    error: uploadError,
    selectFile,
    startUpload,
    reset,
  } = useFileUpload({
    endpoint: '/pdf-tools/split',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: { mode, ...(mode === 'range' ? { pages } : {}) },
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
      selectFile(storeFile);
      clearStoreFile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    if (mode === 'range' && !pages.trim()) {
      setValidationError(t('tools.splitPdf.errors.requiredPages'));
      return;
    }

    setValidationError('');
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setMode('all');
    setPages('');
    setValidationError('');
  };

  const schema = generateToolSchema({
    name: t('tools.splitPdf.title'),
    description: t('tools.splitPdf.description'),
    url: `${window.location.origin}/tools/split-pdf`,
  });

  const getLocalizedSplitError = (message: string) => {
    const outOfRangeMatch = message.match(
      /^Selected pages \((.+)\) are out of range\. This PDF has only (\d+) page(?:s)?\.$/i
    );
    if (outOfRangeMatch) {
      return t('tools.splitPdf.errors.outOfRange', {
        selected: outOfRangeMatch[1],
        total: Number(outOfRangeMatch[2]),
      });
    }

    const invalidFormatMatch = message.match(
      /^Invalid page format: (.+)\. Use a format like 1,3,5-8\.$/i
    );
    if (invalidFormatMatch) {
      return t('tools.splitPdf.errors.invalidFormat', {
        tokens: invalidFormatMatch[1],
      });
    }

    const noPagesSelectedMatch = message.match(
      /^No pages selected\. This PDF has (\d+) page(?:s)?\.$/i
    );
    if (noPagesSelectedMatch) {
      return t('tools.splitPdf.errors.noPagesSelected', {
        total: Number(noPagesSelectedMatch[1]),
      });
    }

    if (
      /Please specify which pages to extract/i.test(message) ||
      /Please specify at least one page/i.test(message)
    ) {
      return t('tools.splitPdf.errors.requiredPages');
    }

    return message;
  };

  return (
    <>
      <Helmet>
        <title>{t('tools.splitPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.splitPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/split-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <Scissors className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="section-heading">{t('tools.splitPdf.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.splitPdf.description')}</p>
        </div>
        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile}
              file={file}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSizeMB={20}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel="PDF (.pdf)"
            />

            {file && !isUploading && (
              <>
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setMode('all');
                      setValidationError('');
                    }}
                    className={`rounded-xl p-3 text-center ring-1 transition-all ${
                      mode === 'all'
                        ? 'bg-primary-50 ring-primary-300 text-primary-700 font-semibold'
                        : 'bg-white ring-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-medium">{t('tools.splitPdf.allPages')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t('tools.splitPdf.allPagesDesc')}</p>
                  </button>
                  <button
                    onClick={() => {
                      setMode('range');
                      setValidationError('');
                    }}
                    className={`rounded-xl p-3 text-center ring-1 transition-all ${
                      mode === 'range'
                        ? 'bg-primary-50 ring-primary-300 text-primary-700 font-semibold'
                        : 'bg-white ring-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-medium">{t('tools.splitPdf.selectPages')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t('tools.splitPdf.selectPagesDesc')}</p>
                  </button>
                </div>

                {/* Page Range Input */}
                {mode === 'range' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {t('tools.splitPdf.pageRange')}
                    </label>
                    <input
                      type="text"
                      value={pages}
                      onChange={(e) => {
                        setPages(e.target.value);
                        if (validationError) setValidationError('');
                      }}
                      placeholder={t('tools.splitPdf.rangePlaceholder')}
                      className="input-field"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      {t('tools.splitPdf.rangeHint')}
                    </p>
                    {validationError && (
                      <p className="mt-2 text-sm text-red-600">{validationError}</p>
                    )}
                  </div>
                )}

                <button onClick={handleUpload} className="btn-primary w-full">
                  {t('tools.splitPdf.shortDesc')}
                </button>
              </>
            )}
          </div>
        )}

        {phase === 'processing' && !result && (
          <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />
        )}

        {phase === 'done' && result && result.status === 'completed' && (
          <DownloadButton result={result} onStartOver={handleReset} />
        )}

        {phase === 'done' && taskError && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
              <p className="text-sm text-red-700">{getLocalizedSplitError(taskError)}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.startOver')}
            </button>
          </div>
        )}      </div>
    </>
  );
}
