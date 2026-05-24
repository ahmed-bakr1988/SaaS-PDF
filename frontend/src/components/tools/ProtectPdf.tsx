import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Lock } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

export default function ProtectPdf() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordsMatch = password === confirmPassword && password.length > 0;

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
    endpoint: '/pdf-tools/protect',
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
    if (!passwordsMatch) return;
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => {
    reset();
    setPassword('');
    setConfirmPassword('');
    setPhase('upload');
  };

  const schema = generateToolSchema({
    name: t('tools.protectPdf.title'),
    description: t('tools.protectPdf.description'),
    url: `${window.location.origin}/tools/protect-pdf`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.protectPdf.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.protectPdf.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/protect-pdf`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="section-heading">{t('tools.protectPdf.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.protectPdf.description')}</p>
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
                    {t('tools.protectPdf.password')}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field w-full"
                    placeholder={t('tools.protectPdf.passwordPlaceholder')}
                    autoComplete="new-password"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {t('tools.protectPdf.confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field w-full"
                    placeholder={t('tools.protectPdf.confirmPlaceholder')}
                    autoComplete="new-password"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="mt-1 text-xs text-red-500">
                      {t('tools.protectPdf.mismatch')}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!passwordsMatch}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {t('tools.protectPdf.shortDesc')}
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
