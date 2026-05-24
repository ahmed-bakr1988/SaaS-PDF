import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { FileText } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

export default function PdfToWord() {
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
    endpoint: '/convert/pdf-to-word',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
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
    name: t('tools.pdfToWord.title'),
    description: t('tools.pdfToWord.description'),
    url: `${window.location.origin}/tools/pdf-to-word`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.pdfToWord.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.pdfToWord.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/pdf-to-word`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        {/* Tool Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <FileText className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="section-heading">{t('tools.pdfToWord.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.pdfToWord.description')}</p>
        </div>

        {/* Ad Slot - Top */}
        {/* Upload Phase */}
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
              <button onClick={handleUpload} className="btn-primary w-full">
                {t('tools.pdfToWord.shortDesc')}
              </button>
            )}
          </div>
        )}

        {/* Processing Phase */}
        {phase === 'processing' && !result && (
          <ProgressBar
            state={status?.state || 'PENDING'}
            message={status?.progress}
          />
        )}

        {/* Done Phase */}
        {phase === 'done' && result && result.status === 'completed' && (
          <DownloadButton result={result} onStartOver={handleReset} />
        )}

        {/* Error */}
        {(phase === 'done' && taskError) && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
              <p className="text-sm text-red-700">{taskError}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.startOver')}
            </button>
          </div>
        )}

        {/* Ad Slot - Bottom */}      </div>
    </>
  );
}
