import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Unlock } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

export default function UnlockPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [password, setPassword] = useState('');

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
    endpoint: '/pdf-tools/unlock',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
    extraData: { password },
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
    if (!password) return;
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPassword('');
    setPhase('upload');
  };

  const schema = generateToolSchema({
    name: t('tools.unlockPdf.title'),
    description: t('tools.unlockPdf.description'),
    url: `${window.location.origin}/tools/unlock-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.unlockPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.unlockPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/unlock-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
            <Unlock className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="section-heading">{t('tools.unlockPdf.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.unlockPdf.description')}</p>
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
                {/* Password Input */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {t('tools.unlockPdf.password')}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field w-full"
                    placeholder={t('tools.unlockPdf.passwordPlaceholder')}
                    autoComplete="current-password"
                  />
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!password}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {t('tools.unlockPdf.shortDesc')}
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
              <p className="text-sm text-red-700">{taskError}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">
              {t('common.startOver')}
            </button>
          </div>
        )}      </div>
    </>
  );
}
