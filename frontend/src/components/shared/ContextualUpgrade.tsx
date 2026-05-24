import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Zap, Upload, Layers, X } from 'lucide-react';
import { useState } from 'react';

type UpgradeContext = 'queue_delay' | 'file_size' | 'batch_limit' | 'ai_feature' | 'general';

interface ContextualUpgradeProps {
  context: UpgradeContext;
  className?: string;
}

const CONTEXT_CONFIG: Record<UpgradeContext, {
  icon: typeof Sparkles;
  titleKey: string;
  titleDefault: string;
  descKey: string;
  descDefault: string;
  color: string;
}> = {
  queue_delay: {
    icon: Zap,
    titleKey: 'upgrade.queueTitle',
    titleDefault: 'Skip the queue',
    descKey: 'upgrade.queueDesc',
    descDefault: 'Upgrade to Pro for priority processing — your files go first.',
    color: 'amber',
  },
  file_size: {
    icon: Upload,
    titleKey: 'upgrade.fileSizeTitle',
    titleDefault: 'Need larger files?',
    descKey: 'upgrade.fileSizeDesc',
    descDefault: 'Pro supports up to 1 GB uploads. Process bigger documents without limits.',
    color: 'blue',
  },
  batch_limit: {
    icon: Layers,
    titleKey: 'upgrade.batchTitle',
    titleDefault: 'Unlock batch processing',
    descKey: 'upgrade.batchDesc',
    descDefault: 'Process up to 20 files at once with Pro. Save time on repetitive tasks.',
    color: 'emerald',
  },
  ai_feature: {
    icon: Sparkles,
    titleKey: 'upgrade.aiTitle',
    titleDefault: 'Unlock AI features',
    descKey: 'upgrade.aiDesc',
    descDefault: 'Get AI summarization, translation, and chat with your documents.',
    color: 'violet',
  },
  general: {
    icon: Sparkles,
    titleKey: 'upgrade.generalTitle',
    titleDefault: 'Get more from Dociva',
    descKey: 'upgrade.generalDesc',
    descDefault: 'Upgrade for faster processing, larger files, and advanced AI features.',
    color: 'primary',
  },
};

export default function ContextualUpgrade({ context, className = '' }: ContextualUpgradeProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const config = CONTEXT_CONFIG[context];
  const Icon = config.icon;

  if (dismissed) return null;

  const colorClasses: Record<string, { bg: string; border: string; icon: string; btn: string }> = {
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'text-amber-600 dark:text-amber-400',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: 'text-emerald-600 dark:text-emerald-400',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
    violet: {
      bg: 'bg-violet-50 dark:bg-violet-950/30',
      border: 'border-violet-200 dark:border-violet-800',
      icon: 'text-violet-600 dark:text-violet-400',
      btn: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white',
    },
    primary: {
      bg: 'bg-primary-50 dark:bg-primary-950/30',
      border: 'border-primary-200 dark:border-primary-800',
      icon: 'text-primary-600 dark:text-primary-400',
      btn: 'bg-primary-600 hover:bg-primary-700 text-white',
    },
  };

  const colors = colorClasses[config.color] || colorClasses.primary;

  return (
    <div className={`relative rounded-xl border ${colors.border} ${colors.bg} p-4 ${className}`}>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        aria-label={t('common.dismiss', 'Dismiss')}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${colors.icon}`} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {t(config.titleKey, config.titleDefault)}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t(config.descKey, config.descDefault)}
          </p>
          <Link
            to="/pricing"
            className={`mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-colors ${colors.btn}`}
          >
            {t('upgrade.viewPlans', 'View Plans')}
          </Link>
        </div>
      </div>
    </div>
  );
}
