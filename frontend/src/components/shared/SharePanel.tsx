import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Mail, MessageCircle, Send, Share2, Link as LinkIcon } from 'lucide-react';
import { trackEvent } from '@/services/analytics';

type ShareVariant = 'page' | 'result';

interface SharePanelProps {
  title: string;
  text: string;
  url: string;
  variant?: ShareVariant;
  className?: string;
}

interface ShareTarget {
  key: string;
  label: string;
  href: string;
}

function openShareWindow(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function SharePanel({
  title,
  text,
  url,
  variant = 'page',
  className = '',
}: SharePanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  if (!url) return null;

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text);

  const targets: ShareTarget[] = [
    {
      key: 'whatsapp',
      label: t('share.targets.whatsapp'),
      href: `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
    },
    {
      key: 'facebook',
      label: t('share.targets.facebook'),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      key: 'telegram',
      label: t('share.targets.telegram'),
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      key: 'x',
      label: t('share.targets.x'),
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      key: 'linkedin',
      label: t('share.targets.linkedin'),
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      key: 'email',
      label: t('share.targets.email'),
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`,
    },
  ];

  const handleNativeShare = async () => {
    if (!canNativeShare) return;

    try {
      await navigator.share({ title, text, url });
      trackEvent('share_clicked', { variant, target: 'native' });
    } catch {
      // Ignore cancelation and rely on the fallback actions below.
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      trackEvent('share_clicked', { variant, target: 'copy' });
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          trackEvent('share_panel_toggled', { variant, open: !open });
        }}
        className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm transition-colors hover:border-sky-300 hover:text-sky-800 dark:border-sky-900/70 dark:bg-slate-900 dark:text-sky-300 dark:hover:border-sky-700"
      >
        <Share2 className="h-4 w-4" />
        {variant === 'result' ? t('share.shareResult') : t('share.shareTool')}
      </button>

      {open && (
        <div className="mt-3 w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="rounded-2xl bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-4 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
              {variant === 'result' ? t('share.resultLabel') : t('share.toolLabel')}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{text}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Share2 className="h-4 w-4" />
                {t('share.native')}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
            >
              {copied ? <LinkIcon className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t('share.copied') : t('share.copyLink')}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {targets.map((target) => (
              <button
                key={target.key}
                type="button"
                onClick={() => {
                  openShareWindow(target.href);
                  trackEvent('share_clicked', { variant, target: target.key });
                }}
                className="rounded-2xl border border-slate-200 px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-sky-800 dark:hover:bg-slate-800"
              >
                <span className="mb-2 block text-slate-400 dark:text-slate-500">
                  {target.key === 'whatsapp' && <MessageCircle className="h-4 w-4" />}
                  {target.key === 'telegram' && <Send className="h-4 w-4" />}
                  {target.key === 'email' && <Mail className="h-4 w-4" />}
                  {!['whatsapp', 'telegram', 'email'].includes(target.key) && <Share2 className="h-4 w-4" />}
                </span>
                <span>{target.label}</span>
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t('share.note')}</p>
        </div>
      )}
    </div>
  );
}