import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Film } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

export default function VideoToGif() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [startTime, setStartTime] = useState(0);
  const [duration, setDuration] = useState(5);
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);

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
    endpoint: '/video/to-gif',
    maxSizeMB: 50,
    acceptedTypes: ['mp4', 'webm'],
    extraData: {
      start_time: startTime.toString(),
      duration: duration.toString(),
      fps: fps.toString(),
      width: width.toString(),
    },
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
    name: t('tools.videoToGif.title'),
    description: t('tools.videoToGif.description'),
    url: `${window.location.origin}/tools/video-to-gif`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.videoToGif.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.videoToGif.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/video-to-gif`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
            <Film className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="section-heading">{t('tools.videoToGif.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.videoToGif.description')}</p>
        </div>
        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile}
              file={file}
              accept={{
                'video/mp4': ['.mp4'],
                'video/webm': ['.webm'],
              }}
              maxSizeMB={50}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              onReset={handleReset}
              acceptLabel="Video (MP4, WebM) — max 50MB"
            />

            {file && !isUploading && (
              <>
                {/* GIF Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {t('tools.videoToGif.startTime')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={startTime}
                      onChange={(e) => setStartTime(Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {t('tools.videoToGif.duration')}
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="15"
                      step="0.5"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {t('tools.videoToGif.fps')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {t('tools.videoToGif.width')}
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="640"
                      step="10"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                </div>

                <button onClick={handleUpload} className="btn-primary w-full">
                  {t('tools.videoToGif.shortDesc')}
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
