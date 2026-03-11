import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ArrowUpDown } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

GlobalWorkerOptions.workerSrc = pdfWorker;

export default function ReorderPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [pageOrder, setPageOrder] = useState('');
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pageCountError, setPageCountError] = useState<string | null>(null);
  const [isReadingPageCount, setIsReadingPageCount] = useState(false);

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint: '/pdf-tools/reorder',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: { page_order: pageOrder },
  });

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: () => setPhase('done'),
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => {
    if (storeFile) { selectFile(storeFile); clearStoreFile(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;

    async function detectPageCount(selectedFile: File) {
      setIsReadingPageCount(true);
      setPageCount(null);
      setPageCountError(null);

      try {
        const data = new Uint8Array(await selectedFile.arrayBuffer());
        loadingTask = getDocument({ data });
        const pdf = await loadingTask.promise;

        if (!cancelled) {
          setPageCount(pdf.numPages);
        }
      } catch {
        if (!cancelled) {
          setPageCountError(t('tools.reorderPdf.pageCountFailed'));
        }
      } finally {
        if (!cancelled) {
          setIsReadingPageCount(false);
        }
        void loadingTask?.destroy();
      }
    }

    if (!file) {
      setPageCount(null);
      setPageCountError(null);
      setIsReadingPageCount(false);
      return undefined;
    }

    void detectPageCount(file);

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [file, t]);

  const getPageOrderError = (): string | null => {
    if (!pageOrder.trim()) {
      return null;
    }

    if (isReadingPageCount) {
      return t('tools.reorderPdf.readingPageCount');
    }

    if (pageCountError) {
      return pageCountError;
    }

    if (pageCount === null) {
      return null;
    }

    const parts = pageOrder
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0 || parts.some((part) => !/^\d+$/.test(part))) {
      return t('tools.reorderPdf.orderInvalidFormat');
    }

    const values = parts.map((part) => Number(part));
    const outOfRange = [...new Set(values.filter((page) => page < 1 || page > pageCount))];

    const seen = new Set<number>();
    const duplicates: number[] = [];
    for (const page of values) {
      if (seen.has(page) && !duplicates.includes(page)) {
        duplicates.push(page);
      }
      seen.add(page);
    }

    const missing: number[] = [];
    for (let page = 1; page <= pageCount; page += 1) {
      if (!seen.has(page)) {
        missing.push(page);
      }
    }

    if (outOfRange.length === 0 && duplicates.length === 0 && missing.length === 0 && values.length === pageCount) {
      return null;
    }

    const details: string[] = [];
    if (outOfRange.length > 0) {
      details.push(t('tools.reorderPdf.orderOutOfRange', { pages: outOfRange.join(', ') }));
    }
    if (missing.length > 0) {
      details.push(t('tools.reorderPdf.orderMissingPages', { pages: missing.join(', ') }));
    }
    if (duplicates.length > 0) {
      details.push(t('tools.reorderPdf.orderDuplicatePages', { pages: duplicates.join(', ') }));
    }

    return `${t('tools.reorderPdf.orderMustIncludeAllPages', { count: pageCount })} ${details.join(' ')}`.trim();
  };

  const pageOrderError = getPageOrderError();
  const canSubmit = Boolean(file && pageOrder.trim() && !pageOrderError && !isUploading);

  const handleUpload = async () => {
    if (!canSubmit) return;
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setPageOrder('');
    setPageCount(null);
    setPageCountError(null);
    setIsReadingPageCount(false);
  };

  const schema = generateToolSchema({
    name: t('tools.reorderPdf.title'),
    description: t('tools.reorderPdf.description'),
    url: `${window.location.origin}/tools/reorder-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.reorderPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.reorderPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/reorder-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30">
            <ArrowUpDown className="h-8 w-8 text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="section-heading">{t('tools.reorderPdf.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.reorderPdf.description')}</p>
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
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('tools.reorderPdf.orderLabel')}
                  </label>
                  <input
                    type="text" value={pageOrder}
                    onChange={(e) => setPageOrder(e.target.value)}
                    placeholder={t('tools.reorderPdf.orderPlaceholder')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    {t('tools.reorderPdf.orderHint')}
                  </p>
                  {isReadingPageCount && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {t('tools.reorderPdf.readingPageCount')}
                    </p>
                  )}
                  {!isReadingPageCount && pageCount !== null && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {t('tools.reorderPdf.pageCount', { count: pageCount })}
                    </p>
                  )}
                  {pageOrderError && (
                    <div className="mt-3 rounded-xl bg-red-50 p-3 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
                      <p className="text-sm text-red-700 dark:text-red-400">{pageOrderError}</p>
                    </div>
                  )}
                </div>
                <button onClick={handleUpload} disabled={!canSubmit}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                  {t('tools.reorderPdf.shortDesc')}
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
