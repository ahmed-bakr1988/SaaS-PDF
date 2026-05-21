import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  Copy,
  Download,
  FolderClock,
  KeyRound,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import {
  getHistory,
  getUsage,
  getApiKeys,
  createApiKey,
  getSocialAuthProviders,
  revokeApiKey,
  type HistoryEntry,
  type UsageSummary,
  type ApiKey,
  getCreditInfo,
  getPublicStats,
  getProfile,
  updateProfile,
  } from '@/services/api';
  import { useAuthStore } from '@/stores/authStore';
  import AccountSidebar, { type AccountTab } from '@/components/layout/AccountSidebar';
  import { cn } from '@/utils/cn';

  import type { UserProfile, SocialAuthProviderOption } from '@/services/apiTypes';

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

// 'x' is temporarily disabled — restore the entry below when X OAuth is ready.
const socialProviderFallback: SocialAuthProviderOption[] = [
  { id: 'google', label: 'Google', available: false, start_url: '/api/auth/social/google/start' },
  { id: 'facebook', label: 'Facebook', available: false, start_url: '/api/auth/social/facebook/start' },
];

function SocialProviderIcon({ provider }: { provider: string }) {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.7-1.6 2.8-3.9 2.8-6.7 0-.7-.1-1.4-.2-2H12Z" />
        <path fill="#34A853" d="M12 21c2.6 0 4.8-.9 6.4-2.5l-3-2.3c-.8.6-1.9 1-3.3 1-2.5 0-4.6-1.7-5.4-4l-3.1 2.4C5.3 18.7 8.4 21 12 21Z" />
        <path fill="#4A90E2" d="M6.6 13.2c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9L3.5 7C2.9 8.3 2.5 9.7 2.5 11.3s.4 3 1 4.3l3.1-2.4Z" />
        <path fill="#FBBC05" d="M12 5.3c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.8 2.6 14.6 1.7 12 1.7 8.4 1.7 5.3 4 3.5 7l3.1 2.4c.8-2.3 2.9-4.1 5.4-4.1Z" />
      </svg>
    );
  }

  if (provider === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          fill="currentColor"
          d="M13.4 21v-7h2.4l.4-2.8h-2.8V9.4c0-.8.2-1.4 1.4-1.4h1.5V5.5c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.7v2.1H8.4V14h2.3v7h2.7Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M18.3 3h2.9l-6.4 7.3L22.3 21h-5.9l-4.6-6.1L6.4 21H3.5l6.8-7.8L2.3 3h6l4.2 5.6L18.3 3Zm-1 16.2h1.6L7.4 4.7H5.7l11.6 14.5Z"
      />
    </svg>
  );
}

export default function AccountPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const initialized = useAuthStore((state) => state.initialized);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);
  const isNewAccount = useAuthStore((state) => state.isNewAccount);
  const clearNewAccount = useAuthStore((state) => state.clearNewAccount);

  // Welcome celebration for new registrations
  useEffect(() => {
    if (isNewAccount && user) {
      toast(t('account.welcomeTitle'), {
        description: t('account.welcomeMessage'),
        icon: <PartyPopper className="h-5 w-5 text-amber-500" />,
        duration: 6000,
      });
      clearNewAccount();
    }
  }, [isNewAccount, user, t, clearNewAccount]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authError = params.get('auth_error');
    if (!authError) {
      return;
    }

    setSubmitError(authError);
    toast.error(authError);
    params.delete('auth_error');
    void navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate]);

  const [mode, setMode] = useState<AuthMode>('login');
  const [activeTab, setActiveTab] = useState<AccountTab>('overview');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [socialProviders, setSocialProviders] = useState<SocialAuthProviderOption[]>(socialProviderFallback);
  const [socialProvidersLoading, setSocialProvidersLoading] = useState(false);

  // Usage summary state
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  // API Keys state (pro only)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyCreating, setNewKeyCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [newKeyError, setNewKeyError] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

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
    if (user) {
      setSocialProviders(socialProviderFallback);
      return;
    }

    let cancelled = false;
    const loadSocialProviders = async () => {
      setSocialProvidersLoading(true);
      try {
        const providers = await getSocialAuthProviders();
        if (!cancelled && providers.length > 0) {
          setSocialProviders(providers);
        }
      } catch {
        if (!cancelled) {
          setSocialProviders(socialProviderFallback);
        }
      } finally {
        if (!cancelled) {
          setSocialProvidersLoading(false);
        }
      }
    };

    void loadSocialProviders();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
      try {
        const keys = await getApiKeys();
        setApiKeys(keys);
      } catch {
        // non-critical
      }
    };

    const loadProfile = async () => {
      try {
        const p = await getProfile();
        setProfile(p);
      } catch {
        // non-critical
      }
    };

    void loadHistory();
    void loadUsage();
    void loadApiKeys();
    void loadProfile();
  }, [t, user]);

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    setProfileSaving(true);
    try {
      const updated = await updateProfile(data);
      setProfile(updated);
      toast.success(t('account.profileUpdated', 'Profile updated successfully.'));
    } catch {
      toast.error(t('account.profileUpdateError', 'Failed to update profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error(t('account.imageTooLarge', 'Image must be less than 1MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await handleUpdateProfile({ profile_picture_url: base64 });
    };
    reader.readAsDataURL(file);
  };

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

  const hasEnabledSocialProvider = socialProviders.some((provider) => provider.available);

  return (
    <>
      <Helmet>
        <title>{t('account.metaTitle')} — {t('common.appName')}</title>
        <meta name="description" content={t('account.heroSubtitle')} />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {!initialized && authLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600 dark:border-brand-800 dark:border-t-brand-400" />
        </div>
      ) : user ? (
        <div className="flex flex-col gap-8 md:flex-row">
          <AccountSidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            onLogout={handleLogout}
            userEmail={user.email}
            isPro={user.plan === 'pro'}
            profilePictureUrl={profile?.profile_picture_url}
          />

          <main className="flex-1 space-y-8 min-w-0">
            {activeTab === 'overview' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <section className="premium-surface relative overflow-hidden p-8 sm:p-12">
                  <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-amber-400/10 blur-[100px] dark:bg-amber-600/5" />
                  <div className="relative space-y-4">
                    <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                      {t('account.heroTitle')}
                    </h1>
                    <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
                      {t('account.heroSubtitle')}
                    </p>
                    {user.plan === 'free' && (
                      <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800/40">
                        <Sparkles className="h-4 w-4" />
                        {t('account.upgradeNotice')}
                      </div>
                    )}
                  </div>
                </section>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: t('account.metricProcessed'), value: dashboardMetrics.totalProcessed, icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: t('account.metricSuccessRate'), value: `${dashboardMetrics.successRate}%`, icon: BadgeCheck, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-900/20' },
                    { label: t('account.metricFavoriteTool'), value: dashboardMetrics.favoriteToolSlug ? formatHistoryTool(dashboardMetrics.favoriteToolSlug, t) : '—', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: t('account.metricFailures'), value: dashboardMetrics.failedCount, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                  ].map((m, i) => (
                    <div key={i} className="premium-card !p-6 flex flex-col gap-4">
                      <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', m.bg)}>
                        <m.icon className={cn('h-6 w-6', m.color)} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{m.label}</p>
                        <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-white">{m.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="premium-card !p-6">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">{t('account.onboardingTitle')}</h3>
                    <div className="space-y-4">
                      {dashboardMetrics.onboardingItems.map((item) => (
                        <div key={item.key} className="flex items-start gap-4 rounded-2xl bg-zinc-50/50 p-4 dark:bg-zinc-900/40">
                          <span className={cn(
                            'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black',
                            item.done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800'
                          )}>
                            {item.done ? <Check className="h-4 w-4" /> : '•'}
                          </span>
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">{item.title}</p>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="premium-card !p-6">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">{t('account.issuesTitle')}</h3>
                    <div className="space-y-4">
                      {dashboardMetrics.recentFailures.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                          <ShieldCheck className="h-12 w-12 opacity-20 mb-4" />
                          <p>{t('account.issuesEmpty')}</p>
                        </div>
                      ) : (
                        dashboardMetrics.recentFailures.map((item) => (
                          <div key={item.id} className="rounded-2xl bg-red-50/50 p-4 ring-1 ring-red-100 dark:bg-red-900/10 dark:ring-red-900/20">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="mt-1 h-5 w-5 text-red-500" />
                              <div>
                                <p className="font-bold text-red-900 dark:text-red-400">{formatHistoryTool(item.tool, t)}</p>
                                <p className="mt-1 text-sm text-red-700 dark:text-red-500/80">
                                  {typeof item.metadata?.error === 'string' ? item.metadata.error : t('account.statusFailed')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{t('account.historyTitle')}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">{t('account.historySubtitle')}</p>
                  </div>
                </div>

                {historyLoading ? (
                  <div className="py-20 text-center text-zinc-400">{t('account.historyLoading')}</div>
                ) : historyError ? (
                  <div className="rounded-2xl bg-red-50 p-6 text-red-700">{historyError}</div>
                ) : historyItems.length === 0 ? (
                  <div className="premium-card py-20 text-center">
                    <FolderClock className="h-16 w-16 mx-auto text-zinc-200 mb-4" />
                    <p className="text-zinc-500">{t('account.historyEmpty')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historyItems.map((item) => (
                      <article key={item.id} className="premium-card !p-6 hover:shadow-md transition-shadow">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900">
                              <Download className="h-6 w-6 text-zinc-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-zinc-900 dark:text-white truncate max-w-xs md:max-w-md">
                                {item.output_filename || item.original_filename || formatHistoryTool(item.tool, t)}
                              </h3>
                              <p className="text-xs text-zinc-500">{dateFormatter.format(new Date(item.created_at))}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                              item.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30' : 'bg-red-50 text-red-700 dark:bg-red-900/30'
                            )}>
                              {item.status === 'completed' ? t('account.statusCompleted') : t('account.statusFailed')}
                            </span>
                            {item.download_url && (
                              <a href={item.download_url} className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                                <Download className="h-5 w-5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'usage' && usage && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{t('account.tabUsage')}</h2>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="premium-card !p-8">
                    <div className="flex items-center justify-between mb-8">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('account.creditBalanceTitle')}</p>
                      <Sparkles className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-zinc-900 dark:text-white">{usage.credits.credits_remaining}</span>
                      <span className="text-zinc-400 font-bold">/ {usage.credits.credits_allocated}</span>
                    </div>
                    <div className="mt-8 h-4 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000"
                        style={{ width: `${(usage.credits.credits_remaining / usage.credits.credits_allocated) * 100}%` }}
                      />
                    </div>
                  </div>

                  {usage.api_quota?.limit != null && (
                    <div className="premium-card !p-8">
                      <div className="flex items-center justify-between mb-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('account.apiQuotaTitle')}</p>
                        <KeyRound className="h-6 w-6 text-brand-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-zinc-900 dark:text-white">{usage.api_quota.used}</span>
                        <span className="text-zinc-400 font-bold">/ {usage.api_quota.limit}</span>
                      </div>
                      <div className="mt-8 h-4 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-brand-400 to-sky-500 transition-all duration-1000"
                          style={{ width: `${(usage.api_quota.used / usage.api_quota.limit) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="premium-card !p-6">
                  <h3 className="font-bold mb-4">{t('account.topToolsTitle')}</h3>
                  <div className="space-y-2">
                    {dashboardMetrics.topTools.map(([tool, count]) => (
                      <div key={tool} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900">
                        <span className="font-medium">{formatHistoryTool(tool, t)}</span>
                        <span className="font-black text-brand-600">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api-keys' && user.plan === 'pro' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{t('account.apiKeysTitle')}</h2>
                
                <div className="premium-card !p-6">
                  <form onSubmit={handleCreateApiKey} className="flex gap-4">
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder={t('account.apiKeyNamePlaceholder')}
                      className="input-field"
                    />
                    <button type="submit" className="btn-primary" disabled={newKeyCreating || !newKeyName.trim()}>
                      {newKeyCreating ? '…' : t('account.apiKeyCreate')}
                    </button>
                  </form>

                  {revealedKey && (
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100 dark:bg-emerald-950/20">
                        <code className="flex-1 font-mono text-sm text-emerald-700">{revealedKey}</code>
                        <button onClick={handleCopyKey} className="text-emerald-600">
                          {copiedKey ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-amber-600 font-bold">{t('account.apiKeyCopyWarning')}</p>
                    </div>
                  )}

                  <div className="mt-10 space-y-4">
                    {apiKeys.map((key) => (
                      <div key={key.id} className={cn(
                        "flex items-center justify-between p-4 rounded-2xl ring-1",
                        key.revoked_at ? "bg-zinc-50 ring-zinc-100 opacity-50" : "bg-white ring-zinc-200 shadow-sm dark:bg-zinc-900 dark:ring-zinc-800"
                      )}>
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-white">{key.name}</p>
                          <p className="font-mono text-xs text-zinc-400">{key.key_prefix}…</p>
                        </div>
                        {!key.revoked_at && (
                          <button onClick={() => handleRevokeApiKey(key.id)} className="text-zinc-400 hover:text-red-500">
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{t('account.tabSettings')}</h2>
                
                <div className="premium-card !p-8">
                  <div className="flex flex-col md:flex-row md:items-center gap-8 mb-10">
                    <div className="relative group shrink-0">
                      <div className="h-24 w-24 rounded-3xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex items-center justify-center ring-4 ring-zinc-50 dark:ring-zinc-800">
                        {profile?.profile_picture_url ? (
                          <img src={profile.profile_picture_url} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-12 w-12 text-zinc-400" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-3xl transition-opacity">
                        <input type="file" accept="image/*" className="hidden" onChange={handleProfilePictureChange} />
                        <PartyPopper className="h-6 w-6" />
                      </label>
                      {profileSaving && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 rounded-3xl">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-black text-zinc-900 dark:text-white">{user.email}</p>
                      <p className="text-zinc-500 uppercase text-xs font-black tracking-widest">{user.plan} account</p>
                      <button 
                        onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                        className="mt-2 text-xs font-bold text-brand-600 hover:underline"
                      >
                        {t('account.changePhoto', 'Change photo')}
                      </button>
                    </div>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      void handleUpdateProfile({
                        first_name: formData.get('first_name') as string,
                        last_name: formData.get('last_name') as string,
                        bio: formData.get('bio') as string,
                      });
                    }}
                    className="grid gap-6 md:grid-cols-2"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-400">{t('account.firstName', 'First Name')}</label>
                      <input 
                        name="first_name" 
                        defaultValue={profile?.first_name || ''} 
                        className="input-field" 
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-400">{t('account.lastName', 'Last Name')}</label>
                      <input 
                        name="last_name" 
                        defaultValue={profile?.last_name || ''} 
                        className="input-field" 
                        placeholder="Doe"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-400">{t('account.bio', 'Bio')}</label>
                      <textarea 
                        name="bio" 
                        defaultValue={profile?.bio || ''} 
                        className="input-field min-h-[100px] resize-none" 
                        placeholder={t('account.bioPlaceholder', 'Tell us about yourself...')}
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <button type="submit" className="btn-primary" disabled={profileSaving}>
                        {profileSaving ? '…' : t('common.saveChanges', 'Save Changes')}
                      </button>
                    </div>
                  </form>

                  <div className="mt-12 h-px bg-zinc-100 dark:bg-zinc-800" />

                  <div className="mt-10 space-y-4">
                    <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50">
                      <p className="text-sm font-bold text-zinc-500 mb-1">{t('account.currentPlan')}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-zinc-900 dark:text-white uppercase">
                          {user.plan === 'pro' ? t('account.plans.pro') : t('account.plans.free')}
                        </span>
                        {user.plan === 'free' && (
                          <a href="/pricing" className="btn-primary !py-2 !px-4 text-xs">
                            {t('account.upgradeCta', 'Upgrade to Pro')}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : (
        <div className="grid gap-12 lg:grid-cols-2 items-center min-h-[70vh]">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              <ShieldCheck className="h-4 w-4" />
              {t('account.benefitsTitle')}
            </div>
            <h1 className="text-5xl font-black tracking-tight text-zinc-950 dark:text-white leading-[1.1]">
              {t('account.heroTitle')}
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-lg">
              {t('account.heroSubtitle')}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {[t('account.benefit1'), t('account.benefit2'), t('account.benefit3')].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 p-4 rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 dark:bg-emerald-900/20">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{benefit}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="premium-card !p-0 overflow-hidden">
            <div className="flex border-b border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => { setMode('login'); setSubmitError(null); }}
                className={cn(
                  "flex-1 py-5 text-sm font-black uppercase tracking-widest transition-all",
                  mode === 'login' ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {t('common.signIn')}
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setSubmitError(null); }}
                className={cn(
                  "flex-1 py-5 text-sm font-black uppercase tracking-widest transition-all",
                  mode === 'register' ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {t('account.createAccount')}
              </button>
            </div>

            <div className="p-8 sm:p-12">
              <div className="mb-8 text-center sm:text-left">
                <h2 className="text-3xl font-black text-zinc-950 dark:text-white">
                  {mode === 'login' ? t('account.signInTitle') : t('account.registerTitle')}
                </h2>
                <p className="mt-2 text-zinc-500">{t('account.formSubtitle')}</p>
              </div>

              <div className="space-y-6">
                <div className="grid gap-3">
                  {socialProviders.map((provider) => {
                    const disabled = authLoading || socialProvidersLoading || !provider.available;
                    return (
                      <a
                        key={provider.id}
                        href={provider.available ? provider.start_url : undefined}
                        className={cn(
                          "flex items-center justify-center gap-3 rounded-2xl border py-4 text-sm font-bold transition-all",
                          disabled 
                            ? "opacity-50 cursor-not-allowed bg-zinc-50 border-zinc-100"
                            : "bg-white border-zinc-200 hover:border-brand-300 hover:bg-brand-50 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-brand-900/10"
                        )}
                      >
                        <SocialProviderIcon provider={provider.id} />
                        {t('account.socialContinueWith', { provider: provider.label })}
                      </a>
                    );
                  })}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-100 dark:border-zinc-800" /></div>
                  <div className="relative flex justify-center text-xs uppercase font-black tracking-widest text-zinc-400">
                    <span className="bg-white px-4 dark:bg-zinc-900">{t('account.orContinueWithEmail')}</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('common.email')}
                    className="input-field"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('common.password')}
                    className="input-field"
                  />
                  {mode === 'register' && (
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('account.confirmPassword')}
                      className="input-field"
                    />
                  )}
                  {submitError && (
                    <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm font-bold">{submitError}</div>
                  )}
                  <button type="submit" className="btn-primary w-full !py-4" disabled={authLoading}>
                    {mode === 'login' ? t('common.signIn') : t('account.createAccount')}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

