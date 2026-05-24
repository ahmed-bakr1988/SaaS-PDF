import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { LucideIcon, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import CostEstimatePanel from '@/components/shared/CostEstimatePanel';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import ToolRating from '@/components/shared/ToolRating';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';
import UpgradeModal from '@/components/shared/UpgradeModal';
import { getToolEntry } from '@/config/toolManifest';

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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  useEffect(() => {
    if (error === t('common.errors.rateLimited')) {
      setShowUpgradeModal(true);
    }
  }, [error, t]);

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

  const manifestEntry = getToolEntry(config.slug);
  const isAiTool = manifestEntry?.group === 'ai-workspace';
  const creditHint = manifestEntry?.creditHint;
  const speedTier = manifestEntry?.speedTier;

  return (
    <>
      <Helmet>
        <title>{title} — Dociva</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${window.location.origin}/tools/${config.slug}`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <ToolRating toolSlug={config.slug} />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${bgColor}`}>
            <config.icon className={`h-8 w-8 ${iconColor}`} aria-hidden="true" />
          </div>
          <h1 className="section-heading">{title}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{description}</p>

          {/* Tool metadata badges */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {isAiTool && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
                AI Powered
              </span>
            )}
            {creditHint && creditHint !== '0' && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800">
                ~{creditHint} {t('common.credits', 'credits')}
              </span>
            )}
            {creditHint === '0' && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800">
                {t('common.free', 'Free')}
              </span>
            )}
            {speedTier && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                {speedTier === 'instant' ? '⚡' : speedTier === 'fast' ? '🚀' : '⏱️'}
                {speedTier === 'instant' ? t('speed.instant', 'Instant') : speedTier === 'fast' ? t('speed.fast', 'Fast') : t('speed.moderate', 'Moderate')}
              </span>
            )}
          </div>
        </div>



        <div className="space-y-6 min-h-[400px]">
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
                    {t('common.uploading')}
                  </>
                ) : (
                  t('common.convert')
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
                      <h2 className="font-semibold text-green-900 dark:text-green-200">{t('result.success')}</h2>
                      <p className="text-sm text-green-700 dark:text-green-300">{t('result.fileReady')}</p>
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
                      <h2 className="font-semibold text-red-900 dark:text-red-200">{t('common.error')}</h2>
                      <p className="text-sm text-red-700 dark:text-red-300">{error || t('common.errors.processingFailed')}</p>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleReset} className="btn-secondary w-full">
                {t('result.processAnother')}
              </button>
            </div>
          )}
        </div>

        {/* Progressive Upgrade Prompt */}
        {phase === 'upload' && (
          <div className="mt-8 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/50 via-white to-purple-50/30 p-5 shadow-sm dark:border-violet-950/40 dark:from-violet-950/10 dark:via-slate-900 dark:to-purple-950/10">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                  {isAiTool ? t('toolTemplate.aiUpgradeTitle', 'Power up your AI productivity') : t('toolTemplate.upgradeTitle', 'Need larger file limits?')}
                </h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed dark:text-slate-400">
                  {isAiTool 
                    ? t('toolTemplate.aiUpgradeDesc', 'Get priority AI processing queue, up to 1GB file analysis, and 1,000 monthly credits with our Pro plan.')
                    : t('toolTemplate.upgradeDesc', 'Upload files up to 1GB, process up to 20 files at once with batch actions, and remove all queue delays.')}
                </p>
              </div>
              <div className="shrink-0 w-full sm:w-auto">
                <a 
                  href="/pricing"
                  className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow hover:bg-violet-700 transition-colors"
                >
                  <span>{t('upgrade.cta', 'Try Pro')}</span>
                </a>
              </div>
            </div>
          </div>
        )}

      </div>

      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          reason="credits_exhausted"
        />
      )}
    </>
  );
}
