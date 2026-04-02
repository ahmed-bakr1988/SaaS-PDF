import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { LucideIcon, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import CostEstimatePanel from '@/components/shared/CostEstimatePanel';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

export interface ToolConfig {
  slug: string;
  icon: LucideIcon;
  color?: 'orange' | 'red' | 'blue' | 'green' | 'purple' | 'pink' | 'amber' | 'cyan';
  i18nKey: string;
  endpoint: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  isPremium?: boolean;
  extraData?: Record<string, any>;
}

export interface ToolTemplateProps {
  file: File | null;
  uploadProgress: number;
  isUploading: boolean;
  isProcessing: boolean;
  result: any;
  error: string | null;
  selectFile: (file: File) => void;
  reset: () => void;
}

const colorMap: Record<string, { bg: string; icon: string }> = {
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', icon: 'text-orange-600 dark:text-orange-400' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'text-blue-600 dark:text-blue-400' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600 dark:text-purple-400' },
  pink: { bg: 'bg-pink-50 dark:bg-pink-900/20', icon: 'text-pink-600 dark:text-pink-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', icon: 'text-cyan-600 dark:text-cyan-400' },
};

interface ToolTemplateComponentProps {
  config: ToolConfig;
  onGetExtraData?: () => Record<string, any>;
  children?: (props: ToolTemplateProps) => React.ReactNode;
}

export default function ToolTemplate({ config, onGetExtraData, children }: ToolTemplateComponentProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [extraData, setExtraData] = useState<Record<string, any>>(config.extraData || {});

  const colors = colorMap[config.color || 'blue'];
  const bgColor = colors.bg;
  const iconColor = colors.icon;

  const { file, uploadProgress, isUploading, taskId, error, selectFile, startUpload, reset } = useFileUpload({
    endpoint: config.endpoint,
    maxSizeMB: config.maxSizeMB || 20,
    acceptedTypes: config.acceptedTypes || ['pdf'],
    extraData,
  });

  const { status, result } = useTaskPolling({
    taskId,
    onComplete: () => setPhase('done'),
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);

  useEffect(() => {
    if (storeFile && config.acceptedTypes?.some((type) => storeFile.name.endsWith(`.${type}`))) {
      selectFile(storeFile);
      clearStoreFile();
      setPhase('upload');
    }
  }, []);

  const handleUpload = useCallback(async () => {
    // Get fresh extraData from child if callback provided
    if (onGetExtraData) {
      const freshExtraData = onGetExtraData();
      setExtraData(freshExtraData);
    }
    const id = await startUpload();
    if (id) setPhase('processing');
  }, [onGetExtraData, startUpload]);

  const handleReset = () => {
    reset();
    setPhase('upload');
  };

  const title = t(`${config.i18nKey}.title`, { defaultValue: config.slug });
  const description = t(`${config.i18nKey}.description`, { defaultValue: '' });

  const schema = generateToolSchema({
    name: title,
    description,
    url: `${window.location.origin}/tools/${config.slug}`,
  });

  const templateProps: ToolTemplateProps = {
    file,
    uploadProgress,
    isUploading,
    isProcessing: phase === 'processing',
    result,
    error,
    selectFile,
    reset: handleReset,
  };

  return (
    <>
      <Helmet>
        <title>{title} — Dociva</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${window.location.origin}/tools/${config.slug}`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${bgColor}`}>
            <config.icon className={`h-8 w-8 ${iconColor}`} aria-hidden="true" />
          </div>
          <h1 className="section-heading">{title}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{description}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        <div className="space-y-6">
          {phase === 'upload' && (
            <div className="space-y-6">
              <FileUploader
                onFileSelect={(f) => {
                  selectFile(f);
                  setPhase('upload');
                }}
                file={file}
                accept={config.acceptedTypes?.reduce(
                  (acc, type) => ({
                    ...acc,
                    [`application/${type}`]: [`.${type}`],
                  }),
                  {}
                ) || {}}
              />

              <CostEstimatePanel toolSlug={config.slug} file={file} />

              {children && (
                <div className="rounded-xl bg-slate-50 p-6 dark:bg-slate-800">{children(templateProps)}</div>
              )}

              <button
                onClick={handleUpload}
                disabled={isUploading || !file}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Clock className="h-5 w-5 animate-spin" />
                    {t('common.uploading', { defaultValue: 'Uploading...' })}
                  </>
                ) : (
                  t('common.convert', { defaultValue: 'Convert' })
                )}
              </button>
            </div>
          )}

          {phase === 'processing' && (
            <div className="rounded-xl bg-slate-50 p-8 text-center dark:bg-slate-800">
              <ProgressBar state={(status as any) || 'PROCESSING'} />
            </div>
          )}

          {phase === 'done' && (
            <div className="space-y-4">
              {result ? (
                <>
                  <div className="rounded-xl bg-green-50 p-6 dark:bg-green-900/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      <div>
                        <h2 className="font-semibold text-green-900 dark:text-green-200">Success!</h2>
                        <p className="text-sm text-green-700 dark:text-green-300">Your file is ready</p>
                      </div>
                    </div>
                  </div>

                  <DownloadButton result={result} onStartOver={handleReset} />
                </>
              ) : (
                <div className="rounded-xl bg-red-50 p-6 dark:bg-red-900/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    <div>
                      <h2 className="font-semibold text-red-900 dark:text-red-200">Error</h2>
                      <p className="text-sm text-red-700 dark:text-red-300">{error || 'Processing failed'}</p>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleReset} className="btn-secondary w-full">
                Process Another
              </button>
            </div>
          )}
        </div>

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}
