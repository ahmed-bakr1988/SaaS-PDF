import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import {
  PenLine,
  Save,
  Share2,
  ShieldCheck,
  Info,
} from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import { TOOL_LIMITS_MB } from '@/config/toolLimits';

export default function PdfEditor() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');

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
    endpoint: '/compress/pdf',
    maxSizeMB: TOOL_LIMITS_MB.pdf,
    acceptedTypes: ['pdf'],
    extraData: { quality: 'high' },
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
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPhase('upload');
  };

  const schema = generateToolSchema({
    name: t('tools.pdfEditor.title'),
    description: t('tools.pdfEditor.description'),
    url: `${window.location.origin}/tools/pdf-editor`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.pdfEditor.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.pdfEditor.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/pdf-editor`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/30">
            <PenLine className="h-8 w-8 text-rose-600 dark:text-rose-400" />
          </div>
          <h1 className="section-heading">{t('tools.pdfEditor.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t('tools.pdfEditor.intro')}
          </p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {/* Upload Phase */}
        {phase === 'upload' && (
          <div className="space-y-6">
            <FileUploader
              onFileSelect={selectFile}
              file={file}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSizeMB={TOOL_LIMITS_MB.pdf}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel="PDF"
            />

            {file && !isUploading && (
              <>
                {/* Steps */}
                <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">1</span>
                      {t('tools.pdfEditor.steps.step1')}
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">2</span>
                      {t('tools.pdfEditor.steps.step2')}
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">3</span>
                      {t('tools.pdfEditor.steps.step3')}
                    </li>
                  </ol>
                </div>

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  className="btn-primary w-full"
                  title={t('tools.pdfEditor.saveTooltip')}
                >
                  <Save className="h-5 w-5" />
                  {t('tools.pdfEditor.save')}
                </button>

                {/* Version & Privacy Notes */}
                <div className="space-y-3">
                  <div className="flex gap-2.5 rounded-xl bg-blue-50 p-3 text-xs text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{t('tools.pdfEditor.versionNote')}</span>
                  </div>
                  <div className="flex gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{t('tools.pdfEditor.privacyNote')}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Processing Phase */}
        {phase === 'processing' && !result && (
          <div className="space-y-3">
            <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              {t('tools.pdfEditor.applyingChangesSub')}
            </p>
          </div>
        )}

        {/* Done Phase - Success */}
        {phase === 'done' && result && result.status === 'completed' && (
          <div className="space-y-4">
            <DownloadButton result={result} onStartOver={handleReset} />

            {/* Share button */}
            {result.download_url && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.download_url!);
                }}
                className="btn-secondary w-full"
                title={t('tools.pdfEditor.share')}
              >
                <Share2 className="h-5 w-5" />
                {t('tools.pdfEditor.share')}
              </button>
            )}
          </div>
        )}

        {/* Done Phase - Error */}
        {phase === 'done' && taskError && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">
                {t('tools.pdfEditor.processingFailed')}
              </p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('tools.pdfEditor.retry')}
            </button>
          </div>
        )}

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}
