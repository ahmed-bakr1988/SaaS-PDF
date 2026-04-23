import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Code } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';

const PAGE_FORMATS = ['A4', 'A3', 'A5', 'Letter', 'Legal'] as const;
const DEFAULT_MARGINS = {
  top: '0',
  right: '0',
  bottom: '0',
  left: '0',
};

export default function HtmlToPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [pageFormat, setPageFormat] = useState<(typeof PAGE_FORMATS)[number]>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printBackground, setPrintBackground] = useState(true);
  const [entryHtml, setEntryHtml] = useState('index.html');
  const [margins, setMargins] = useState(DEFAULT_MARGINS);

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint: '/convert/html-to-pdf',
    maxSizeMB: 25,
    acceptedTypes: ['html', 'htm', 'zip'],
    extraData: {
      page_format: pageFormat,
      orientation,
      print_background: String(printBackground),
      margin_top: margins.top,
      margin_right: margins.right,
      margin_bottom: margins.bottom,
      margin_left: margins.left,
      ...(entryHtml.trim() ? { entry_html: entryHtml.trim() } : {}),
    },
  });
  const isZipFile = file?.name.toLowerCase().endsWith('.zip') ?? false;

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: () => setPhase('done'),
    onError: () => setPhase('done'),
  });

  const handleUpload = async () => {
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleMarginChange = (side: keyof typeof DEFAULT_MARGINS, value: string) => {
    setMargins((current) => ({ ...current, [side]: value }));
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
    setPageFormat('A4');
    setOrientation('portrait');
    setPrintBackground(true);
    setEntryHtml('index.html');
    setMargins(DEFAULT_MARGINS);
  };

  const schema = generateToolSchema({
    name: t('tools.htmlToPdf.title'),
    description: t('tools.htmlToPdf.description'),
    url: `${window.location.origin}/tools/html-to-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.htmlToPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.htmlToPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/html-to-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/30">
            <Code className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
          <h1 className="section-heading">{t('tools.htmlToPdf.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.htmlToPdf.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile} file={file}
              accept={{ 'text/html': ['.html', '.htm'], 'application/zip': ['.zip'] }}
              maxSizeMB={25} isUploading={isUploading}
              uploadProgress={uploadProgress} error={uploadError}
              onReset={handleReset} acceptLabel={t('tools.htmlToPdf.uploadLabel')}
            />

            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 space-y-5">
              <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800">
                <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {t('tools.htmlToPdf.engineTitle')}
                </h2>
                <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                  {t('tools.htmlToPdf.engineDescription')}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('tools.htmlToPdf.pageFormatLabel')}
                  </label>
                  <select
                    value={pageFormat}
                    onChange={(event) => setPageFormat(event.target.value as (typeof PAGE_FORMATS)[number])}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  >
                    {PAGE_FORMATS.map((format) => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('tools.htmlToPdf.orientationLabel')}
                  </label>
                  <select
                    value={orientation}
                    onChange={(event) => setOrientation(event.target.value as 'portrait' | 'landscape')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  >
                    <option value="portrait">{t('tools.htmlToPdf.orientationPortrait')}</option>
                    <option value="landscape">{t('tools.htmlToPdf.orientationLandscape')}</option>
                  </select>
                </div>
              </div>

              {isZipFile && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('tools.htmlToPdf.entryHtmlLabel')}
                  </label>
                  <input
                    type="text"
                    value={entryHtml}
                    onChange={(event) => setEntryHtml(event.target.value)}
                    placeholder={t('tools.htmlToPdf.entryHtmlPlaceholder')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {t('tools.htmlToPdf.entryHtmlHint')}
                  </p>
                </div>
              )}

              <div>
                <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('tools.htmlToPdf.marginsTitle')}
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t('tools.htmlToPdf.marginTopLabel')}
                    </label>
                    <input
                      type="text"
                      value={margins.top}
                      onChange={(event) => handleMarginChange('top', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t('tools.htmlToPdf.marginRightLabel')}
                    </label>
                    <input
                      type="text"
                      value={margins.right}
                      onChange={(event) => handleMarginChange('right', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t('tools.htmlToPdf.marginBottomLabel')}
                    </label>
                    <input
                      type="text"
                      value={margins.bottom}
                      onChange={(event) => handleMarginChange('bottom', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t('tools.htmlToPdf.marginLeftLabel')}
                    </label>
                    <input
                      type="text"
                      value={margins.left}
                      onChange={(event) => handleMarginChange('left', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:ring-slate-700">
                <input
                  type="checkbox"
                  checked={printBackground}
                  onChange={(event) => setPrintBackground(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('tools.htmlToPdf.printBackgroundLabel')}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    {t('tools.htmlToPdf.printBackgroundHint')}
                  </span>
                </span>
              </label>
            </div>

            {file && !isUploading && (
              <button onClick={handleUpload} className="btn-primary w-full">
                {t('tools.htmlToPdf.shortDesc')}
              </button>
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
