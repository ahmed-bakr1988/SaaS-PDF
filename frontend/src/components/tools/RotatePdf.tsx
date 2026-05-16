import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { RotateCw, RotateCcw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { useFileStore } from '@/stores/fileStore';
import { toast } from 'sonner';
import api, { type TaskResponse } from '@/services/api';
import { generateToolSchema } from '@/utils/seo';

import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Rotation = 90 | 180 | 270;

export default function RotatePdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'rotate' | 'processing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(90);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageMode, setPageMode] = useState<'all' | 'current' | 'range'>('all');
  const [pageRange, setPageRange] = useState('');
  const [previewWidth, setPreviewWidth] = useState(720);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [pageRotation, setPageRotation] = useState(0);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: () => setPhase('done'),
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);

  useEffect(() => {
    if (storeFile) {
      handleFileSelect(storeFile);
      clearStoreFile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const updateWidth = () => {
      if (!previewRef.current) return;
      const nextWidth = Math.max(280, Math.min(previewRef.current.clientWidth - 24, 820));
      setPreviewWidth(nextWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (previewRef.current) {
      observer.observe(previewRef.current);
    }
    window.addEventListener('resize', updateWidth);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const handleFileSelect = (nextFile: File | null) => {
    setFile(nextFile);
    setError(null);
    setTaskId(null);
    setCurrentPage(1);
    setNumPages(0);
    setPageMode('all');
    setPageRange('');
    setZoomLevel(100);
    setPageRotation(0);
    if (pdfFileUrl) {
      URL.revokeObjectURL(pdfFileUrl);
    }
    if (nextFile) {
      setPdfFileUrl(URL.createObjectURL(nextFile));
      setPhase('rotate');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setError(null);
    setPhase('processing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('rotation', String(rotation));
      const selectedPages = pageMode === 'all'
        ? 'all'
        : pageMode === 'current'
          ? String(currentPage)
          : pageRange.trim();
      fd.append('pages', selectedPages || String(currentPage));

      const res = await api.post<TaskResponse>('/pdf-tools/rotate', fd);
      setTaskId(res.data.task_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.errors.processingFailed');
      setError(msg);
      toast.error(msg);
      setPhase('done');
    }
  };

  const handleReset = () => {
    setPhase('upload');
    setFile(null);
    if (pdfFileUrl) URL.revokeObjectURL(pdfFileUrl);
    setPdfFileUrl(null);
    setTaskId(null);
    setError(null);
    setRotation(90);
    setCurrentPage(1);
    setNumPages(0);
    setPageMode('all');
    setPageRange('');
    setZoomLevel(100);
    setPageRotation(0);
  };

  const effectivePreviewWidth = Math.round((previewWidth * zoomLevel) / 100);

  const rotateLeft = () => {
    setPageRotation((prev) => (prev - 90 + 360) % 360);
  };

  const rotateRight = () => {
    setPageRotation((prev) => (prev + 90) % 360);
  };

  const rotations: { value: Rotation; label: string }[] = [
    { value: 90, label: '90°' },
    { value: 180, label: '180°' },
    { value: 270, label: '270°' },
  ];

  const schema = generateToolSchema({
    name: t('tools.rotatePdf.title'),
    description: t('tools.rotatePdf.description'),
    url: `${window.location.origin}/tools/rotate-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.rotatePdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.rotatePdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/rotate-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-900/30">
            <RotateCw className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h1 className="section-heading">{t('tools.rotatePdf.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.rotatePdf.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="mx-auto max-w-2xl space-y-4">
            <FileUploader
              onFileSelect={handleFileSelect}
              file={file}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSizeMB={20}
              acceptLabel="PDF (.pdf)"
            />
          </div>
        )}

        {phase === 'rotate' && pdfFileUrl && (
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('tools.rotatePdf.title')}
              </h2>
              <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-100 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-900/40">
                {t('tools.rotatePdf.visualInstruction', 'Choose the rotation angle, then select which pages to apply it to.')}
              </p>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('tools.rotatePdf.rotationAngle')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {rotations.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRotation(r.value)}
                      className={`rounded-xl p-3 text-center ring-1 transition-all ${
                        rotation === r.value
                          ? 'bg-primary-50 ring-primary-300 text-primary-700 font-semibold dark:bg-primary-900/30 dark:ring-primary-700 dark:text-primary-300'
                          : 'bg-white ring-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:ring-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      <RotateCw className={`mx-auto h-5 w-5 mb-1 ${
                        rotation === r.value ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'
                      }`} />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('tools.rotatePdf.pagesLabel', 'Pages')}
                </p>
                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  <label className="flex items-center justify-between gap-3">
                    <span>{t('tools.rotatePdf.allPages', 'All pages')}</span>
                    <input
                      type="radio"
                      name="rotate-scope"
                      checked={pageMode === 'all'}
                      onChange={() => setPageMode('all')}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>{t('tools.rotatePdf.currentPage', 'Current page')}</span>
                    <input
                      type="radio"
                      name="rotate-scope"
                      checked={pageMode === 'current'}
                      onChange={() => setPageMode('current')}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>{t('tools.rotatePdf.pageRange', 'Page range')}</span>
                    <input
                      type="radio"
                      name="rotate-scope"
                      checked={pageMode === 'range'}
                      onChange={() => setPageMode('range')}
                    />
                  </label>
                  {pageMode === 'range' && (
                    <input
                      value={pageRange}
                      onChange={(event) => setPageRange(event.target.value)}
                      placeholder={t('tools.rotatePdf.pageRangePlaceholder', 'Example: 1-3, 6, 9-12')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                {t('tools.rotatePdf.scopeHelp', 'Use page ranges when only some pages need rotation. Example: 1-3, 8, 10-12.')}
              </div>

              <button onClick={handleUpload} className="btn-primary mt-10 w-full">
                {t('tools.rotatePdf.shortDesc')}
              </button>
              <button onClick={handleReset} className="btn-secondary mt-3 w-full">
                {t('common.cancel', 'Cancel')}
              </button>
            </aside>

            <section className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-slate-900">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('tools.rotatePdf.zoomLabel', 'Zoom')}: {zoomLevel}%
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setZoomLevel((prev) => Math.max(60, prev - 10))} className="rounded-lg border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200">
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={rotateLeft} className="rounded-lg border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200" aria-label="Rotate left">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={rotateRight} className="rounded-lg border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200" aria-label="Rotate right">
                    <RotateCw className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setZoomLevel((prev) => Math.min(160, prev + 10))} className="rounded-lg border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200">
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                ref={previewRef}
                className="flex min-h-[720px] flex-col items-center justify-between overflow-auto rounded-xl bg-slate-200/70 p-3 dark:bg-slate-950/30"
              >
                <Document
                  file={pdfFileUrl}
                  onLoadSuccess={({ numPages: loadedPages }) => {
                    setNumPages(loadedPages);
                    setCurrentPage((prev) => Math.min(prev, loadedPages || 1));
                  }}
                  className="w-full"
                >
                  <div className="flex justify-center">
                    <div style={{ transform: `rotate(${pageRotation}deg)`, transition: 'transform 0.2s ease' }}>
                      <Page
                        pageNumber={currentPage}
                        width={effectivePreviewWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>
                  </div>
                </Document>

                <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-md p-1 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t('tools.rotatePdf.previousPage', 'Previous page')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>
                    {currentPage} / {numPages || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(numPages || 1, prev + 1))}
                    disabled={currentPage >= numPages}
                    className="rounded-md p-1 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t('tools.rotatePdf.nextPage', 'Next page')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {phase === 'processing' && !result && (
          <div className="mx-auto max-w-2xl">
            <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />
          </div>
        )}

        {phase === 'done' && result && result.status === 'completed' && (
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
              {t('tools.rotatePdf.doneSummary', 'Rotated {{rotated}} page(s) out of {{total}}.', {
                rotated: result.rotated_pages ?? 0,
                total: result.total_pages ?? numPages,
              })}
            </div>
            <DownloadButton result={result} onStartOver={handleReset} />
          </div>
        )}

        {phase === 'done' && (taskError || error) && (
          <div className="mx-auto max-w-2xl space-y-4">
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
