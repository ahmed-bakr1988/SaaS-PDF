import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Scissors, ZoomIn, ZoomOut } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { useFileStore } from '@/stores/fileStore';
import { toast } from 'sonner';
import api, { type TaskResponse } from '@/services/api';

import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-image-crop/dist/ReactCrop.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DEFAULT_CROP: Crop = {
  unit: '%',
  x: 10,
  y: 10,
  width: 80,
  height: 80,
};

export default function CropPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'crop' | 'processing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfFileUrl, setPdfFileUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>(DEFAULT_CROP);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageMode, setPageMode] = useState<'all' | 'current' | 'range'>('all');
  const [pageRange, setPageRange] = useState('');
  const [previewWidth, setPreviewWidth] = useState(720);
  const [zoomLevel, setZoomLevel] = useState(100);
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
    setCrop(DEFAULT_CROP);
    setCurrentPage(1);
    setNumPages(0);
    setPageMode('all');
    setPageRange('');
    setZoomLevel(100);
    if (pdfFileUrl) {
      URL.revokeObjectURL(pdfFileUrl);
    }
    if (nextFile) {
      setPdfFileUrl(URL.createObjectURL(nextFile));
      setPhase('crop');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!crop.width || !crop.height || crop.width <= 0 || crop.height <= 0) {
      toast.error(t('tools.cropPdf.invalidSelection', 'Please draw a valid crop area first.'));
      return;
    }

    setError(null);
    setPhase('processing');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const selectedPages = pageMode === 'all'
        ? 'all'
        : pageMode === 'current'
          ? String(currentPage)
          : pageRange.trim();
      fd.append('pages', selectedPages || String(currentPage));
      fd.append('crop_x_pct', String(crop.x ?? 0));
      fd.append('crop_y_pct', String(crop.y ?? 0));
      fd.append('crop_width_pct', String(crop.width ?? 0));
      fd.append('crop_height_pct', String(crop.height ?? 0));

      const res = await api.post<TaskResponse>('/pdf-tools/crop', fd);
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
    setCrop(DEFAULT_CROP);
    setCurrentPage(1);
    setNumPages(0);
    setPageMode('all');
    setPageRange('');
    setZoomLevel(100);
  };

  const effectivePreviewWidth = Math.round((previewWidth * zoomLevel) / 100);

  const applyPreset = (preset: 'trim' | 'focus' | 'reset') => {
    if (preset === 'reset') {
      setCrop(DEFAULT_CROP);
      return;
    }

    if (preset === 'trim') {
      setCrop({ unit: '%', x: 4, y: 4, width: 92, height: 92 });
      return;
    }

    setCrop({ unit: '%', x: 10, y: 12, width: 80, height: 76 });
  };

  return (
    <>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-100 dark:bg-yellow-900/30">
            <Scissors className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h1 className="section-heading">{t('tools.cropPdf.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.cropPdf.description')}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{t('tools.cropPdf.trustPrecise', 'Precise visual crop')}</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{t('tools.cropPdf.trustScans', 'Great for scanned margins')}</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">{t('tools.cropPdf.trustRange', 'Apply to one page, all pages, or a range')}</span>
          </div>
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

        {phase === 'crop' && pdfFileUrl && (
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('tools.cropPdf.title')}
              </h2>
              <p className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-100 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-900/40">
                {t('tools.cropPdf.visualInstruction', 'Drag the frame to keep the part you want, then choose whether to apply it to the current page or all pages.')}
              </p>

              <button
                type="button"
                onClick={() => setCrop(DEFAULT_CROP)}
                className="mt-6 text-sm font-medium text-red-600 underline-offset-4 hover:underline dark:text-red-400"
              >
                {t('tools.cropPdf.resetCrop', 'Reset crop')}
              </button>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => applyPreset('trim')} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {t('tools.cropPdf.presetTrim', 'Trim margins')}
                </button>
                <button type="button" onClick={() => applyPreset('focus')} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {t('tools.cropPdf.presetFocus', 'Focus area')}
                </button>
                <button type="button" onClick={() => applyPreset('reset')} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {t('tools.cropPdf.presetReset', 'Default')}
                </button>
              </div>

              <div className="mt-8">
                <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('tools.cropPdf.pagesLabel', 'Pages')}
                </p>
                <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  <label className="flex items-center justify-between gap-3">
                    <span>{t('tools.cropPdf.allPages', 'All pages')}</span>
                    <input
                      type="radio"
                      name="crop-scope"
                      checked={pageMode === 'all'}
                      onChange={() => setPageMode('all')}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>{t('tools.cropPdf.currentPage', 'Current page')}</span>
                    <input
                      type="radio"
                      name="crop-scope"
                      checked={pageMode === 'current'}
                      onChange={() => setPageMode('current')}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span>{t('tools.cropPdf.pageRange', 'Page range')}</span>
                    <input
                      type="radio"
                      name="crop-scope"
                      checked={pageMode === 'range'}
                      onChange={() => setPageMode('range')}
                    />
                  </label>
                  {pageMode === 'range' && (
                    <input
                      value={pageRange}
                      onChange={(event) => setPageRange(event.target.value)}
                      placeholder={t('tools.cropPdf.pageRangePlaceholder', 'Example: 1-3, 6, 9-12')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                {t('tools.cropPdf.scopeHelp', 'Use page ranges when only some scanned pages need cleanup. Example: 1-3, 8, 10-12.')}
              </div>

              <button onClick={handleUpload} className="btn-primary mt-10 w-full">
                {t('tools.cropPdf.shortDesc')}
              </button>
              <button onClick={handleReset} className="btn-secondary mt-3 w-full">
                {t('common.cancel', 'Cancel')}
              </button>
            </aside>

            <section className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-slate-900">
                <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {t('tools.cropPdf.zoomLabel', 'Zoom')}: {zoomLevel}%
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setZoomLevel((prev) => Math.max(60, prev - 10))} className="rounded-lg border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200">
                    <ZoomOut className="h-4 w-4" />
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
                    <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} keepSelection>
                      <Page
                        pageNumber={currentPage}
                        width={effectivePreviewWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </ReactCrop>
                  </div>
                </Document>

                <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-md p-1 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t('tools.cropPdf.previousPage', 'Previous page')}
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
                    aria-label={t('tools.cropPdf.nextPage', 'Next page')}
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
              {t('tools.cropPdf.doneSummary', 'Crop applied to {{cropped}} page(s) out of {{total}}.', {
                cropped: result.cropped_pages ?? 0,
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
