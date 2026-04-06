import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Download, RotateCcw, Clock, Lock } from 'lucide-react';
import type { TaskResult } from '@/services/api';
import { formatFileSize } from '@/utils/textTools';
import { trackEvent } from '@/services/analytics';
import { dispatchCurrentToolRatingPrompt } from '@/utils/ratingPrompt';
import SharePanel from '@/components/shared/SharePanel';
import SuggestedTools from '@/components/seo/SuggestedTools';
import SignUpToDownloadModal from '@/components/shared/SignUpToDownloadModal';
import { useAuthStore } from '@/stores/authStore';

interface DownloadButtonProps {
  /** Task result containing download URL */
  result: TaskResult;
  /** Called when user wants to start over */
  onStartOver: () => void;
}

export default function DownloadButton({ result, onStartOver }: DownloadButtonProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [showGateModal, setShowGateModal] = useState(false);
  const currentToolSlug = location.pathname.startsWith('/tools/')
    ? location.pathname.replace('/tools/', '')
    : null;

  // Extract the download task ID from the download URL path
  // URL format: /api/download/<task_id>/<filename>
  const downloadTaskId = (() => {
    if (!result.download_url) return undefined;
    const parts = result.download_url.split('/');
    const idx = parts.indexOf('download');
    return idx >= 0 && parts.length > idx + 1 ? parts[idx + 1] : undefined;
  })();

  const handleDownloadClick = () => {
    trackEvent('download_clicked', { filename: result.filename || 'unknown' });
    dispatchCurrentToolRatingPrompt();
  };

  if (!result.download_url) return null;

  return (
    <div className="rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-800">
      {/* Success header */}
      <div className="mb-4 text-center">
        <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
          {t('result.conversionComplete')}
        </p>
        <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
          {t('result.downloadReady')}
        </p>
      </div>

      {/* File stats */}
      {(result.original_size || result.compressed_size) && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {result.original_size && (
            <div className="rounded-lg bg-white p-3 text-center dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('result.originalSize')}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatFileSize(result.original_size)}
              </p>
            </div>
          )}
          {result.compressed_size && (
            <div className="rounded-lg bg-white p-3 text-center dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('result.newSize')}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatFileSize(result.compressed_size)}
              </p>
            </div>
          )}
          {result.reduction_percent !== undefined && (
            <div className="rounded-lg bg-white p-3 text-center dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('result.reduction')}</p>
              <p className="text-sm font-semibold text-emerald-600">
                {result.reduction_percent}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Download button */}
      {user ? (
        <a
          href={result.download_url}
          download={result.filename}
          onClick={handleDownloadClick}
          className="btn-success w-full"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download className="h-5 w-5 shrink-0" />
          <span className="truncate">{t('common.download')} — {result.filename}</span>
        </a>
      ) : (
        <button
          onClick={() => setShowGateModal(true)}
          className="btn-primary w-full"
        >
          <Lock className="h-5 w-5" />
          {t('downloadGate.downloadCta')}
        </button>
      )}

      {showGateModal && (
        <SignUpToDownloadModal
          onClose={() => setShowGateModal(false)}
          taskId={downloadTaskId}
          toolSlug={currentToolSlug ?? undefined}
        />
      )}

      <div className="mt-3 flex justify-center">
        <SharePanel
          variant="result"
          title={result.filename || t('share.resultFallbackTitle')}
          text={t('share.resultDescription', {
            filename: result.filename || t('share.resultFallbackTitle'),
          })}
          url={result.download_url}
        />
      </div>

      {/* Expiry notice */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        {t('result.linkExpiry')}
      </div>

      {/* Start over */}
      <button
        onClick={onStartOver}
        className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
      >
        <RotateCcw className="h-4 w-4" />
        {t('common.startOver')}
      </button>

      {currentToolSlug && <SuggestedTools currentSlug={currentToolSlug} />}
    </div>
  );
}
