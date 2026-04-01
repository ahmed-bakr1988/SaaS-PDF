import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BarChart3,
  BadgeCheck,
  Check,
  Copy,
  Download,
  FolderClock,
  KeyRound,
  LogOut,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Zap,
} from 'lucide-react';
import {
  getHistory,
  getUsage,
  getApiKeys,
  createApiKey,
  revokeApiKey,
  type HistoryEntry,
  type UsageSummary,
  type ApiKey,
} from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

type AuthMode = 'login' | 'register';

const toolKeyMap: Record<string, string> = {
  'pdf-to-word': 'tools.pdfToWord.title',
  'word-to-pdf': 'tools.wordToPdf.title',
  'compress-pdf': 'tools.compressPdf.title',
  'compress-image': 'tools.compressImage.title',
  'crop-pdf': 'tools.cropPdf.title',
  'crop-image': 'tools.imageCrop.title',
  'edit-metadata': 'tools.pdfMetadata.title',
  'excel-to-pdf': 'tools.excelToPdf.title',
  'extract-pages': 'tools.extractPages.title',
  'extract-tables': 'tools.tableExtractor.title',
  'flatten-pdf': 'tools.flattenPdf.title',
  'html-to-pdf': 'tools.htmlToPdf.title',
  'image-convert': 'tools.imageConvert.title',
  'image-converter': 'tools.imageConvert.title',
  'image-crop': 'tools.imageCrop.title',
  'image-resize': 'tools.imageConvert.title',
  'image-rotate-flip': 'tools.imageRotateFlip.title',
  'video-to-gif': 'tools.videoToGif.title',
  'merge-pdf': 'tools.mergePdf.title',
  'ocr': 'tools.ocr.title',
  'split-pdf': 'tools.splitPdf.title',
  'pdf-metadata': 'tools.pdfMetadata.title',
  'pdf-to-excel': 'tools.pdfToExcel.title',
  'pdf-to-pptx': 'tools.pdfToPptx.title',
  'rotate-pdf': 'tools.rotatePdf.title',
  'page-numbers': 'tools.pageNumbers.title',
  'pdf-to-images': 'tools.pdfToImages.title',
  'images-to-pdf': 'tools.imagesToPdf.title',
  'watermark-pdf': 'tools.watermarkPdf.title',
  'protect-pdf': 'tools.protectPdf.title',
  'unlock-pdf': 'tools.unlockPdf.title',
  'repair-pdf': 'tools.repairPdf.title',
  'remove-background': 'tools.removeBg.title',
  'remove-bg': 'tools.removeBg.title',
  'remove-watermark-pdf': 'tools.removeWatermark.title',
  'reorder-pdf': 'tools.reorderPdf.title',
  'sign-pdf': 'tools.signPdf.title',
  'summarize-pdf': 'tools.summarizePdf.title',
  'translate-pdf': 'tools.translatePdf.title',
  'chat-pdf': 'tools.chatPdf.title',
  'barcode': 'tools.barcode.title',
  'barcode-generator': 'tools.barcode.title',
  'pptx-to-pdf': 'tools.pptxToPdf.title',
  'pdf-flowchart': 'tools.pdfFlowchart.title',
  'pdf-flowchart-sample': 'tools.pdfFlowchart.title',
  'qr-code': 'tools.qrCode.title',
};

function formatHistoryTool(tool: string, t: (key: string) => string) {
  const translationKey = toolKeyMap[tool];
  return translationKey ? t(translationKey) : tool;
}

export default function AccountPage() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const initialized = useAuthStore((state) => state.initialized);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Usage summary state
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  // API Keys state (pro only)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyCreating, setNewKeyCreating] = useState(false);
  const [newKeyError, setNewKeyError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [i18n.language]
  );

  const dashboardMetrics = useMemo(() => {
    const completedItems = historyItems.filter((item) => item.status === 'completed');
    const failedItems = historyItems.filter((item) => item.status !== 'completed');
    const toolCounts = historyItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.tool] = (acc[item.tool] || 0) + 1;
      return acc;
    }, {});

    const favoriteToolSlug = Object.entries(toolCounts)
      .sort((left, right) => right[1] - left[1])[0]?.[0] || null;

    return {
      totalProcessed: historyItems.length,
      completedCount: completedItems.length,
      failedCount: failedItems.length,
      favoriteToolSlug,
      successRate: historyItems.length ? Math.round((completedItems.length / historyItems.length) * 100) : 0,
      topTools: Object.entries(toolCounts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 4),
      recentFailures: failedItems.slice(0, 3),
      onboardingItems: [
        {
          key: 'firstTask',
          done: historyItems.length > 0,
          title: t('account.onboardingFirstTaskTitle'),
          description: t('account.onboardingFirstTaskDesc'),
        },
        {
          key: 'upgrade',
          done: user?.plan === 'pro',
          title: t('account.onboardingUpgradeTitle'),
          description: t('account.onboardingUpgradeDesc'),
        },
        {
          key: 'apiKey',
          done: user?.plan !== 'pro' ? false : apiKeys.some((key) => !key.revoked_at),
          title: t('account.onboardingApiTitle'),
          description: t('account.onboardingApiDesc'),
        },
      ],
    };
  }, [apiKeys, historyItems, t, user?.plan]);

  useEffect(() => {
    if (!user) {
      setHistoryItems([]);
      setHistoryError(null);
      setUsage(null);
      setApiKeys([]);
      return;
    }

    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const items = await getHistory();
        setHistoryItems(items);
      } catch (error) {
        setHistoryError(error instanceof Error ? error.message : t('account.loadFailed'));
      } finally {
        setHistoryLoading(false);
      }
    };

    const loadUsage = async () => {
      try {
        const data = await getUsage();
        setUsage(data);
      } catch {
        // non-critical, ignore
      }
    };

    const loadApiKeys = async () => {
      if (user.plan !== 'pro') return;
      setApiKeysLoading(true);
      try {
        const keys = await getApiKeys();
        setApiKeys(keys);
      } catch {
        // non-critical
      } finally {
        setApiKeysLoading(false);
      }
    };

    void loadHistory();
    void loadUsage();
    void loadApiKeys();
  }, [t, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (mode === 'register' && password !== confirmPassword) {
      const msg = t('account.passwordMismatch');
      setSubmitError(msg);
      toast.error(msg);
      return;
    }

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }

      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('account.loadFailed');
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  const handleLogout = async () => {
    setSubmitError(null);
    try {
      await logout();
      setHistoryItems([]);
      setUsage(null);
      setApiKeys([]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('account.loadFailed');
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  const handleCreateApiKey = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewKeyError(null);
    const name = newKeyName.trim();
    if (!name) return;
    setNewKeyCreating(true);
    try {
      const key = await createApiKey(name);
      setApiKeys((prev) => [key, ...prev]);
      setRevealedKey(key.raw_key ?? null);
      setNewKeyName('');
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('account.loadFailed');
      setNewKeyError(msg);
      toast.error(msg);
    } finally {
      setNewKeyCreating(false);
    }
  };

  const handleRevokeApiKey = async (keyId: number) => {
    try {
      await revokeApiKey(keyId);
      setApiKeys((prev) =>
        prev.map((k) =>
          k.id === keyId ? { ...k, revoked_at: new Date().toISOString() } : k
        )
      );
    } catch {
      // ignore
    }
  };

  const handleCopyKey = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <>
      <Helmet>
        <title>{t('account.metaTitle')} — {t('common.appName')}</title>
        <meta name="description" content={t('account.heroSubtitle')} />
      </Helmet>

      {!initialized && authLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400" />
        </div>
      ) : user ? (
        <div className="space-y-8">
          <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-100 via-orange-50 to-white p-8 shadow-sm ring-1 ring-amber-200 dark:from-amber-950/60 dark:via-slate-900 dark:to-slate-950 dark:ring-amber-900/50">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-700/40">
                  {user.plan === 'pro' ? <Zap className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                  {user.plan === 'pro' ? t('account.proPlanBadge') : t('account.freePlanBadge')}
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  {t('account.heroTitle')}
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  {t('account.heroSubtitle')}
                </p>
                {user.plan === 'free' && (
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {t('account.upgradeNotice')}
                  </p>
                )}
              </div>

              <div className="rounded-[1.5rem] bg-white/90 p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900/90 dark:ring-slate-800">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
                    <UserRound className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    <span className="text-sm font-medium">{t('account.signedInAs')}</span>
                  </div>
                  <p className="max-w-xs break-all text-lg font-semibold text-slate-900 dark:text-white">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Sparkles className="h-4 w-4" />
                    <span>
                      {t('account.currentPlan')}: {user.plan === 'pro' ? t('account.plans.pro') : t('account.plans.free')}
                    </span>
                  </div>
                  <button type="button" onClick={handleLogout} className="btn-secondary w-full">
                    <LogOut className="h-4 w-4" />
                    {t('account.logoutCta')}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Credit Balance Cards */}
          {usage && usage.credits && (
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="card rounded-[1.5rem] p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {t('account.creditBalanceTitle')}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {usage.credits.credits_remaining}
                  <span className="text-base font-normal text-slate-400"> / {usage.credits.credits_allocated}</span>
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${Math.min(100, (usage.credits.credits_used / usage.credits.credits_allocated) * 100)}%` }}
                  />
                </div>
                {usage.credits.window_end && (
                  <p className="mt-2 text-xs text-slate-400">
                    {t('account.creditWindowResets')}: {new Date(usage.credits.window_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              {usage.api_quota?.limit != null && (
                <div className="card rounded-[1.5rem] p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    {t('account.apiQuotaTitle')}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    {usage.api_quota.used}
                    <span className="text-base font-normal text-slate-400"> / {usage.api_quota.limit}</span>
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, (usage.api_quota.used / usage.api_quota.limit) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="card rounded-[2rem] p-0">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {t('account.dashboardTitle')}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('account.dashboardSubtitle')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.5rem] bg-slate-50 p-5 dark:bg-slate-800/80">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('account.metricProcessed')}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{dashboardMetrics.totalProcessed}</p>
                </div>
                <div className="rounded-[1.5rem] bg-slate-50 p-5 dark:bg-slate-800/80">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('account.metricSuccessRate')}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{dashboardMetrics.successRate}%</p>
                </div>
                <div className="rounded-[1.5rem] bg-slate-50 p-5 dark:bg-slate-800/80">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('account.metricFavoriteTool')}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    {dashboardMetrics.favoriteToolSlug
                      ? formatHistoryTool(dashboardMetrics.favoriteToolSlug, t)
                      : t('account.metricFavoriteToolEmpty')}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-slate-50 p-5 dark:bg-slate-800/80">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{t('account.metricFailures')}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{dashboardMetrics.failedCount}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.1fr]">
                <div className="rounded-[1.5rem] border border-slate-200 p-5 dark:border-slate-700">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('account.topToolsTitle')}</h3>
                  <div className="mt-4 space-y-3">
                    {dashboardMetrics.topTools.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('account.historyEmpty')}</p>
                    ) : (
                      dashboardMetrics.topTools.map(([tool, count]) => (
                        <div key={tool} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatHistoryTool(tool, t)}</span>
                          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 p-5 dark:border-slate-700">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('account.issuesTitle')}</h3>
                  <div className="mt-4 space-y-3">
                    {dashboardMetrics.recentFailures.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('account.issuesEmpty')}</p>
                    ) : (
                      dashboardMetrics.recentFailures.map((item) => (
                        <div key={item.id} className="rounded-xl bg-red-50 px-4 py-3 dark:bg-red-950/30">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
                            <div>
                              <p className="text-sm font-semibold text-red-800 dark:text-red-300">{formatHistoryTool(item.tool, t)}</p>
                              <p className="mt-1 text-xs text-red-700 dark:text-red-400">{typeof item.metadata?.error === 'string' ? item.metadata.error : t('account.statusFailed')}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 p-5 dark:border-slate-700">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('account.onboardingTitle')}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('account.onboardingSubtitle')}</p>
                  <div className="mt-4 space-y-3">
                    {dashboardMetrics.onboardingItems.map((item) => (
                      <div key={item.key} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${item.done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {item.done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">•</span>}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* API Key Management — Pro only */}
          {user.plan === 'pro' && (
            <section className="card rounded-[2rem] p-0">
              <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {t('account.apiKeysTitle')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('account.apiKeysSubtitle')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-6">
                {/* Create key form */}
                <form onSubmit={handleCreateApiKey} className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder={t('account.apiKeyNamePlaceholder')}
                    maxLength={100}
                    className="input flex-1"
                  />
                  <button type="submit" className="btn-primary" disabled={newKeyCreating || !newKeyName.trim()}>
                    {newKeyCreating ? '…' : t('account.apiKeyCreate')}
                  </button>
                </form>
                {newKeyError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{newKeyError}</p>
                )}
                {/* Revealed key — shown once after creation */}
                {revealedKey && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/60 dark:bg-emerald-950/30">
                    <code className="flex-1 break-all font-mono text-xs text-emerald-800 dark:text-emerald-200">
                      {revealedKey}
                    </code>
                    <button type="button" onClick={handleCopyKey} className="shrink-0 text-emerald-700 dark:text-emerald-300">
                      {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button type="button" onClick={() => setRevealedKey(null)} className="shrink-0 text-slate-400 hover:text-slate-600">
                      ×
                    </button>
                  </div>
                )}
                {revealedKey && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">{t('account.apiKeyCopyWarning')}</p>
                )}
                {/* Key list */}
                {apiKeysLoading ? (
                  <p className="text-sm text-slate-500">{t('account.historyLoading')}</p>
                ) : apiKeys.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('account.apiKeysEmpty')}</p>
                ) : (
                  <ul className="space-y-2">
                    {apiKeys.map((key) => (
                      <li
                        key={key.id}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                          key.revoked_at
                            ? 'border-slate-200 bg-slate-50 opacity-50 dark:border-slate-700 dark:bg-slate-900/40'
                            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/70'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{key.name}</p>
                          <p className="font-mono text-xs text-slate-400">{key.key_prefix}…</p>
                          {key.revoked_at && (
                            <p className="text-xs text-red-500">{t('account.apiKeyRevoked')}</p>
                          )}
                        </div>
                        {!key.revoked_at && (
                          <button
                            type="button"
                            onClick={() => handleRevokeApiKey(key.id)}
                            className="ml-4 text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                            title={t('account.apiKeyRevoke')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          <section className="card rounded-[2rem] p-0">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <FolderClock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {t('account.historyTitle')}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('account.historySubtitle')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-6">
              {historyLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('account.historyLoading')}</p>
              ) : historyError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {historyError}
                </div>
              ) : historyItems.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-base font-medium text-slate-700 dark:text-slate-200">{t('account.historyEmpty')}</p>
                </div>
              ) : (
                historyItems.map((item) => {
                  const metadataError =
                    typeof item.metadata?.error === 'string' ? item.metadata.error : null;

                  return (
                    <article
                      key={item.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            {formatHistoryTool(item.tool, t)}
                          </p>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {item.output_filename || item.original_filename || formatHistoryTool(item.tool, t)}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('account.createdAt')}: {dateFormatter.format(new Date(item.created_at))}
                          </p>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {item.status === 'completed'
                            ? t('account.statusCompleted')
                            : t('account.statusFailed')}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/80">
                          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            {t('account.originalFile')}
                          </p>
                          <p className="mt-1 break-all font-medium text-slate-800 dark:text-slate-100">
                            {item.original_filename || '—'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/80">
                          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            {t('account.outputFile')}
                          </p>
                          <p className="mt-1 break-all font-medium text-slate-800 dark:text-slate-100">
                            {item.output_filename || '—'}
                          </p>
                        </div>
                      </div>

                      {metadataError ? (
                        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                          {metadataError}
                        </p>
                      ) : null}

                      {item.download_url && item.status === 'completed' ? (
                        <a href={item.download_url} className="btn-primary mt-4 inline-flex">
                          <Download className="h-4 w-4" />
                          {t('account.downloadResult')}
                        </a>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-cyan-100 via-white to-amber-50 p-8 shadow-sm ring-1 ring-cyan-200 dark:from-cyan-950/50 dark:via-slate-950 dark:to-amber-950/30 dark:ring-cyan-900/40">
            <div className="max-w-xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-cyan-900 ring-1 ring-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-200 dark:ring-cyan-700/40">
                <ShieldCheck className="h-4 w-4" />
                {t('account.benefitsTitle')}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {t('account.heroTitle')}
              </h1>
              <p className="text-base leading-7 text-slate-600 dark:text-slate-300">
                {t('account.heroSubtitle')}
              </p>
            </div>

            <div className="mt-8 grid gap-4">
              {[t('account.benefit1'), t('account.benefit2'), t('account.benefit3')].map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 rounded-[1.25rem] bg-white/80 px-4 py-4 shadow-sm ring-1 ring-white dark:bg-slate-900/80 dark:ring-slate-800"
                >
                  <KeyRound className="mt-0.5 h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <p className="text-sm font-medium leading-6 text-slate-700 dark:text-slate-200">{benefit}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setSubmitError(null);
                }}
                className={`px-5 py-4 text-sm font-semibold transition-colors ${
                  mode === 'login'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/70'
                }`}
              >
                {t('common.signIn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setSubmitError(null);
                }}
                className={`px-5 py-4 text-sm font-semibold transition-colors ${
                  mode === 'register'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/70'
                }`}
              >
                {t('account.createAccount')}
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {mode === 'login' ? t('account.signInTitle') : t('account.registerTitle')}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {t('account.formSubtitle')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('common.email')}
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t('account.emailPlaceholder')}
                    className="input-field"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('common.password')}
                  </span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t('account.passwordPlaceholder')}
                    className="input-field"
                  />
                </label>

                {mode === 'register' ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('account.confirmPassword')}
                    </span>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder={t('account.confirmPasswordPlaceholder')}
                      className="input-field"
                    />
                  </label>
                ) : null}

                {submitError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    {submitError}
                  </div>
                ) : null}

                <button type="submit" className="btn-primary w-full" disabled={authLoading}>
                  {mode === 'login' ? t('account.submitLogin') : t('account.submitRegister')}
                </button>

                {mode === 'login' && (
                  <p className="text-center text-sm">
                    <a href="/forgot-password" className="text-primary-600 hover:underline dark:text-primary-400">
                      {t('auth.forgotPassword.link')}
                    </a>
                  </p>
                )}
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
