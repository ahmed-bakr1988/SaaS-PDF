import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface ActivityItem {
  id: string;
  toolName: string;
  fileName: string;
  status: 'completed' | 'failed' | 'processing';
  timestamp: string;
}

interface WorkspaceActivityProps {
  items: ActivityItem[];
  className?: string;
}

const STATUS_CONFIG = {
  completed: {
    icon: CheckCircle,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    label: 'Completed',
  },
  failed: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    label: 'Failed',
  },
  processing: {
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    label: 'Processing',
  },
};

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function WorkspaceActivity({ items, className = '' }: WorkspaceActivityProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className={`rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800 ${className}`}>
        <FileText className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {t('dashboard.noActivity', 'No recent activity. Start processing files to see your history here.')}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-700">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {t('dashboard.recentActivity', 'Recent Activity')}
        </h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {items.slice(0, 8).map((item) => {
          const statusConfig = STATUS_CONFIG[item.status];
          const StatusIcon = statusConfig.icon;
          return (
            <div key={item.id} className="flex items-center gap-3 px-6 py-3.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${statusConfig.bg}`}>
                <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate dark:text-white">
                  {item.toolName}
                </p>
                <p className="text-xs text-slate-500 truncate dark:text-slate-400">
                  {item.fileName}
                </p>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                {formatTimeAgo(item.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
