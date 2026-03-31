import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  DollarSign,
  Globe,
  Heart,
  Inbox,
  LogOut,
  MessageSquare,
  RefreshCcw,
  Search,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  getAdminPlanInterest,
  getAdminRatingsDetail,
  getAdminSystemHealth,
  getAdminToolAnalytics,
  getAdminUserStats,
  getInternalAdminContacts,
  getInternalAdminOverview,
  listInternalAdminUsers,
  markInternalAdminContactRead,
  updateInternalAdminUserRole,
  updateInternalAdminUserPlan,
  type AdminPlanInterest,
  type AdminRatingsDetail,
  type AdminSystemHealth,
  type AdminToolAnalytics,
  type AdminUserStats,
  type InternalAdminContact,
  type InternalAdminOverview,
  type InternalAdminUser,
  getDatabaseStats,
  type DatabaseStats,
  getProjectEvents,
  type ProjectEvent,
  type ProjectEventsResponse,
  createAdminUser,
  deleteAdminUser,
  updateAdminUserPlan,
  updateAdminUserRole,
} from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

type AdminTab = 'overview' | 'users' | 'tools' | 'ratings' | 'contacts' | 'system' | 'database' | 'events';
type Lang = 'ar' | 'en';

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: {
    // Page & header
    pageTitle: 'Internal Admin | Dociva',
    internalOps: 'Internal operations',
    controlRoom: 'Admin control room',
    controlRoomDesc: 'Monitor project health, user activity, tool performance, ratings, and system status.',
    roleLabel: 'Role:',
    refresh: 'Refresh',
    signOut: 'Sign out',
    // Auth
    checkingSession: 'Checking admin session...',
    adminSignIn: 'Admin sign in',
    adminSignInDesc: 'Use an allowlisted internal account to access the admin control room.',
    passwordPlaceholder: 'Password',
    signInBtn: 'Sign in as admin',
    noAdminAccessMsg: 'This account does not have internal admin access.',
    noAdminPermission: 'No admin permission',
    notAdminDesc: 'You are signed in as {email}, but this account does not have admin access.',
    backToAccount: 'Back to account',
    // Tabs
    tabOverview: 'Overview',
    tabUsers: 'Users',
    tabTools: 'Tool Analytics',
    tabRatings: 'Ratings & Reviews',
    tabContacts: 'Inbox',
    tabSystem: 'System Health',
    tabDatabase: 'Database',
    tabEvents: 'Events Timeline',
    // Overview cards
    totalUsers: 'Total users',
    filesProcessed: 'Files processed',
    inLast24h: 'in the last 24h',
    proFreeCaption: '{pro} pro / {free} free',
    successRate: 'Success rate',
    failuresTracked: 'failures tracked',
    unreadContacts: 'Unread contacts',
    totalInboxItems: 'total inbox items',
    aiSpend: 'AI spend',
    ofBudget: '{pct}% of {budget} budget',
    averageRating: 'Average rating',
    ratingsCollected: 'ratings collected',
    upgradeClicks: 'Upgrade clicks',
    last7dSuffix: '{clicks} last 7 days / {unique} unique users',
    aiStatus: 'AI status',
    active: 'Active',
    notConfigured: 'Not configured',
    modelLabel: 'Model: {model}',
    checkKey: 'Check OPENROUTER_API_KEY',
    // Overview sections
    topTools: 'Top tools',
    totalRunsSuffix: 'total runs',
    failedBadge: 'failed',
    recentFailures: 'Recent failures',
    unknownFile: 'Unknown file',
    processingFailed: 'Processing failed without a structured error message.',
    noToolActivity: 'No tool activity yet.',
    noRecentFailures: 'No recent failures.',
    latestRegistrations: 'Latest registrations',
    emailCol: 'Email',
    planCol: 'Plan',
    tasksCol: 'Tasks',
    joinedCol: 'Joined',
    // Users tab
    newLast7d: 'New (7 days)',
    newLast30d: 'New (30 days)',
    proUsers: 'Pro users',
    dailyReg30d: 'Daily registrations (30 days)',
    userManagement: 'User management',
    searchEmailPlaceholder: 'Search user email',
    searchBtn: 'Search',
    roleCol: 'Role',
    apiKeysCol: 'API keys',
    actionsCol: 'Actions',
    allowlisted: 'Allowlisted',
    tasksSummary: '{ok} ok / {fail} fail',
    createdLabel: 'Created {date}',
    mostActiveUsers: 'Most active users',
    totalTasksCol: 'Total tasks',
    loadingText: 'Loading...',
    // Tools tab
    toolUsageBreakdown: 'Tool usage breakdown',
    toolUsageDesc: 'Detailed usage, success rates, and user counts per tool.',
    toolCol: 'Tool',
    totalCol: 'Total',
    successCol: 'Success',
    rateCol: 'Rate',
    usersCol: 'Users',
    dailyProcessing30d: 'Daily processing (30 days)',
    completedLabel: 'Completed',
    failedLabel: 'Failed',
    mostCommonErrors30d: 'Most common errors (30 days)',
    // Ratings tab
    ratingSummaryByTool: 'Rating summary by tool',
    ratingsCountSuffix: 'ratings',
    positiveLabel: 'positive',
    negativeLabel: 'negative',
    allReviews: 'All reviews',
    reviewsFilterLabel: 'All reviews — {tool}',
    totalRatingsLabel: '{n} total ratings',
    clearFilter: 'Clear filter',
    previous: 'Previous',
    next: 'Next',
    pageOf: 'Page {p} of {total}',
    noRatingsFound: 'No ratings found.',
    // Contacts tab
    contactInbox: 'Contact inbox',
    unreadOfTotal: '{unread} unread of {total} total messages.',
    noSubject: 'No subject',
    markAsRead: 'Mark as read',
    readLabel: 'Read',
    noContactMessages: 'No contact messages found.',
    // System tab
    aiServiceLabel: 'AI service',
    offlineLabel: 'Offline',
    errorRate1h: 'Error rate (1h)',
    failedOfTotal: '{fail} failed / {total} total',
    aiBudgetUsed: 'AI budget used',
    databaseSize: 'Database size',
    paidPlanInterest: 'Paid plan interest',
    paidPlanInterestDesc: 'Users who clicked upgrade buttons on the pricing page.',
    totalClicksLabel: 'Total clicks',
    uniqueUsersLabel: 'Unique users',
    last7DaysLabel: 'Last 7 days',
    last30DaysLabel: 'Last 30 days',
    byPlanBilling: 'By plan & billing',
    recentInterest: 'Recent interest',
    userCol: 'User',
    billingCol: 'Billing',
    dateCol: 'Date',
    anonymousLabel: 'Anonymous',
    clicksSuffix: 'clicks',
    // Buttons
    btnFree: 'Free',
    btnPro: 'Pro',
    btnUser: 'User',
    btnAdmin: 'Admin',
    // Errors
    loadError: 'Failed to load dashboard data.',
    loginError: 'Unable to sign in.',
    updatePlanError: 'Unable to update plan.',
    updateRoleError: 'Unable to update role.',
    updateContactError: 'Unable to update contact message.',
    // Events tab
    eventsTimeline: 'Events Timeline',
    eventsDesc: 'Chronological view of all important project activities.',
    eventUserRegistered: 'User registered',
    eventFileProcessed: 'File processed',
    eventFileFailed: 'File failed',
    eventContactMessage: 'Contact message',
    eventSummary: 'Event Summary',
    totalEvents: 'Total events',
    periodDays: 'Last {days} days',
    // User management
    createUser: 'Create User',
    deleteUser: 'Delete',
    deleteUserConfirm: 'Are you sure you want to delete this user? This cannot be undone.',
    createUserTitle: 'Create New User',
    createUserDesc: 'Add a new user to the system.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    planLabel: 'Plan',
    roleLabel: 'Role',
    createBtn: 'Create',
    cancelBtn: 'Cancel',
    userCreated: 'User created successfully.',
    userDeleted: 'User deleted successfully.',
    planUpdated: 'Plan updated successfully.',
    roleUpdated: 'Role updated successfully.',
  },
  ar: {
    // Page & header
    pageTitle: 'لوحة الإدارة | Dociva',
    internalOps: 'العمليات الداخلية',
    controlRoom: 'غرفة التحكم',
    controlRoomDesc: 'مراقبة صحة المشروع ونشاط المستخدمين وأداء الأدوات والتقييمات وحالة النظام.',
    roleLabel: 'الدور:',
    refresh: 'تحديث',
    signOut: 'تسجيل الخروج',
    // Auth
    checkingSession: 'جارٍ التحقق من جلسة المشرف...',
    adminSignIn: 'دخول المشرف',
    adminSignInDesc: 'استخدم حسابًا داخليًا مصرّحًا للوصول إلى لوحة التحكم.',
    passwordPlaceholder: 'كلمة المرور',
    signInBtn: 'دخول كمشرف',
    noAdminAccessMsg: 'هذا الحساب لا يملك صلاحيات المشرف.',
    noAdminPermission: 'لا توجد صلاحية مشرف',
    notAdminDesc: 'أنت مسجّل الدخول بـ {email}، لكن هذا الحساب لا يملك صلاحيات الإدارة.',
    backToAccount: 'العودة للحساب',
    // Tabs
    tabOverview: 'نظرة عامة',
    tabUsers: 'المستخدمون',
    tabTools: 'تحليلات الأدوات',
    tabRatings: 'التقييمات والمراجعات',
    tabContacts: 'صندوق الوارد',
    tabSystem: 'صحة النظام',
    tabDatabase: 'قاعدة البيانات',
    tabEvents: 'الجدول الزمني للأحداث',
    // Overview cards
    totalUsers: 'إجمالي المستخدمين',
    filesProcessed: 'الملفات المعالجة',
    inLast24h: 'في آخر 24 ساعة',
    proFreeCaption: '{pro} pro / {free} مجاني',
    successRate: 'معدل النجاح',
    failuresTracked: 'أخطاء مرصودة',
    unreadContacts: 'رسائل غير مقروءة',
    totalInboxItems: 'إجمالي الرسائل',
    aiSpend: 'إنفاق الذكاء الاصطناعي',
    ofBudget: '{pct}% من ميزانية {budget}',
    averageRating: 'متوسط التقييم',
    ratingsCollected: 'تقييم مجمّع',
    upgradeClicks: 'نقرات الترقية',
    last7dSuffix: '{clicks} في آخر 7 أيام / {unique} مستخدم فريد',
    aiStatus: 'حالة الذكاء الاصطناعي',
    active: 'نشط',
    notConfigured: 'غير مهيأ',
    modelLabel: 'النموذج: {model}',
    checkKey: 'تحقق من OPENROUTER_API_KEY',
    // Overview sections
    topTools: 'أكثر الأدوات استخدامًا',
    totalRunsSuffix: 'تشغيلة',
    failedBadge: 'فشل',
    recentFailures: 'الأخطاء الأخيرة',
    unknownFile: 'ملف غير معروف',
    processingFailed: 'فشلت المعالجة دون رسالة خطأ محددة.',
    noToolActivity: 'لا يوجد نشاط للأدوات بعد.',
    noRecentFailures: 'لا توجد أخطاء حديثة.',
    latestRegistrations: 'أحدث التسجيلات',
    emailCol: 'البريد الإلكتروني',
    planCol: 'الخطة',
    tasksCol: 'المهام',
    joinedCol: 'تاريخ الانضمام',
    // Users tab
    newLast7d: 'جدد (7 أيام)',
    newLast30d: 'جدد (30 يومًا)',
    proUsers: 'مستخدمو Pro',
    dailyReg30d: 'التسجيلات اليومية (30 يومًا)',
    userManagement: 'إدارة المستخدمين',
    searchEmailPlaceholder: 'بحث بالبريد الإلكتروني',
    searchBtn: 'بحث',
    roleCol: 'الدور',
    apiKeysCol: 'مفاتيح API',
    actionsCol: 'الإجراءات',
    allowlisted: 'قائمة مسموحة',
    tasksSummary: '{ok} ناجح / {fail} فاشل',
    createdLabel: 'أُنشئ {date}',
    mostActiveUsers: 'الأكثر نشاطًا',
    totalTasksCol: 'إجمالي المهام',
    loadingText: 'جارٍ التحميل...',
    // Tools tab
    toolUsageBreakdown: 'تفصيل استخدام الأدوات',
    toolUsageDesc: 'تفاصيل الاستخدام ومعدلات النجاح وعدد المستخدمين لكل أداة.',
    toolCol: 'الأداة',
    totalCol: 'الإجمالي',
    successCol: 'نجاح',
    rateCol: 'النسبة',
    usersCol: 'المستخدمون',
    dailyProcessing30d: 'المعالجة اليومية (30 يومًا)',
    completedLabel: 'مكتمل',
    failedLabel: 'فاشل',
    mostCommonErrors30d: 'أكثر الأخطاء شيوعًا (30 يومًا)',
    // Ratings tab
    ratingSummaryByTool: 'ملخص التقييمات حسب الأداة',
    ratingsCountSuffix: 'تقييم',
    positiveLabel: 'إيجابي',
    negativeLabel: 'سلبي',
    allReviews: 'جميع المراجعات',
    reviewsFilterLabel: 'جميع المراجعات — {tool}',
    totalRatingsLabel: '{n} تقييم إجمالي',
    clearFilter: 'حذف الفلتر',
    previous: 'السابق',
    next: 'التالي',
    pageOf: 'صفحة {p} من {total}',
    noRatingsFound: 'لم يتم العثور على تقييمات.',
    // Contacts tab
    contactInbox: 'صندوق رسائل التواصل',
    unreadOfTotal: '{unread} غير مقروء من أصل {total} رسالة.',
    noSubject: 'بدون موضوع',
    markAsRead: 'تعيين كمقروء',
    readLabel: 'مقروء',
    noContactMessages: 'لا توجد رسائل تواصل.',
    // System tab
    aiServiceLabel: 'خدمة الذكاء الاصطناعي',
    offlineLabel: 'غير متاح',
    errorRate1h: 'معدل الخطأ (ساعة)',
    failedOfTotal: '{fail} فاشل / {total} إجمالي',
    aiBudgetUsed: 'الميزانية المستهلكة',
    databaseSize: 'حجم قاعدة البيانات',
    paidPlanInterest: 'الاهتمام بالخطط المدفوعة',
    paidPlanInterestDesc: 'المستخدمون الذين نقروا على زر الترقية في صفحة الأسعار.',
    totalClicksLabel: 'إجمالي النقرات',
    uniqueUsersLabel: 'مستخدمون فريدون',
    last7DaysLabel: 'آخر 7 أيام',
    last30DaysLabel: 'آخر 30 يومًا',
    byPlanBilling: 'حسب الخطة والدورة',
    recentInterest: 'الاهتمام الأخير',
    userCol: 'المستخدم',
    billingCol: 'الدورة',
    dateCol: 'التاريخ',
    anonymousLabel: 'مجهول',
    clicksSuffix: 'نقرة',
    // Buttons
    btnFree: 'مجاني',
    btnPro: 'Pro',
    btnUser: 'مستخدم',
    btnAdmin: 'مشرف',
    // Errors
    loadError: 'فشل تحميل بيانات لوحة التحكم.',
    loginError: 'تعذّر تسجيل الدخول.',
    updatePlanError: 'تعذّر تحديث الخطة.',
    updateRoleError: 'تعذّر تحديث الدور.',
    updateContactError: 'تعذّر تحديث رسالة التواصل.',
    // Events tab
    eventsTimeline: 'الجدول الزمني للأحداث',
    eventsDesc: 'عرض زمني لجميع أنشطة المشروع المهمة.',
    eventUserRegistered: 'تسجيل مستخدم',
    eventFileProcessed: 'معالجة ملف',
    eventFileFailed: 'فشل ملف',
    eventContactMessage: 'رسالة تواصل',
    eventSummary: 'ملخص الأحداث',
    totalEvents: 'إجمالي الأحداث',
    periodDays: 'آخر {days} يوم',
    // User management
    createUser: 'إنشاء مستخدم',
    deleteUser: 'حذف',
    deleteUserConfirm: 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا.',
    createUserTitle: 'إنشاء مستخدم جديد',
    createUserDesc: 'إضافة مستخدم جديد إلى النظام.',
    emailLabel: 'البريد الإلكتروني',
    passwordLabel: 'كلمة المرور',
    planLabel: 'الخطة',
    roleLabel: 'الدور',
    createBtn: 'إنشاء',
    cancelBtn: 'إلغاء',
    userCreated: 'تم إنشاء المستخدم بنجاح.',
    userDeleted: 'تم حذف المستخدم بنجاح.',
    planUpdated: 'تم تحديث الخطة بنجاح.',
    roleUpdated: 'تم تحديث الدور بنجاح.',
  },
};

function tr(template: string, vars: Record<string, string | number> = {}): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    template,
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
        />
      ))}
    </span>
  );
}

export default function InternalAdminPage() {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const authLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Overview state
  const [overview, setOverview] = useState<InternalAdminOverview | null>(null);
  const [systemHealth, setSystemHealth] = useState<AdminSystemHealth | null>(null);

  // Users state
  const [users, setUsers] = useState<InternalAdminUser[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [userStats, setUserStats] = useState<AdminUserStats | null>(null);

  // Tools state
  const [toolAnalytics, setToolAnalytics] = useState<AdminToolAnalytics | null>(null);

  // Ratings state
  const [ratingsDetail, setRatingsDetail] = useState<AdminRatingsDetail | null>(null);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsToolFilter, setRatingsToolFilter] = useState('');

  // Contacts state
  const [contacts, setContacts] = useState<InternalAdminContact[]>([]);
  const [contactMeta, setContactMeta] = useState({ total: 0, unread: 0, page: 1, perPage: 20 });

  // Plan interest state
  const [planInterest, setPlanInterest] = useState<AdminPlanInterest | null>(null);

  // Database state
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);

  // Events state
  const [projectEvents, setProjectEvents] = useState<ProjectEventsResponse | null>(null);
  const [eventsDays, setEventsDays] = useState(30);

  // User management state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPlan, setNewUserPlan] = useState('free');
  const [newUserRole, setNewUserRole] = useState('user');

  // Language
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('admin-lang') as Lang) ?? 'en');
  const isRtl = lang === 'ar';
  function t(key: string): string { return TRANSLATIONS[lang][key] ?? key; }
  function toggleLang() {
    const next: Lang = lang === 'en' ? 'ar' : 'en';
    setLang(next);
    localStorage.setItem('admin-lang', next);
  }

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<number | null>(null);
  const [markingMessageId, setMarkingMessageId] = useState<number | null>(null);

  const isAdmin = user?.role === 'admin';

  const tabs: { key: AdminTab; label: string; icon: typeof BarChart3 }[] = [
    { key: 'overview', label: t('tabOverview'), icon: BarChart3 },
    { key: 'users', label: t('tabUsers'), icon: Users },
    { key: 'tools', label: t('tabTools'), icon: Activity },
    { key: 'ratings', label: t('tabRatings'), icon: Star },
    { key: 'contacts', label: t('tabContacts'), icon: Inbox },
    { key: 'system', label: t('tabSystem'), icon: ShieldCheck },
    { key: 'database', label: t('tabDatabase'), icon: Database },
    { key: 'events', label: t('tabEvents'), icon: Clock },
  ];

  useEffect(() => {
    if (!isAdmin) return;
    void loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeTab]);

  async function loadTab(tab: AdminTab) {
    setLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 'overview': {
          const [ov, health, pi] = await Promise.all([
            getInternalAdminOverview(),
            getAdminSystemHealth(),
            getAdminPlanInterest(),
          ]);
          setOverview(ov);
          setSystemHealth(health);
          setPlanInterest(pi);
          break;
        }
        case 'users': {
          const [usersData, stats] = await Promise.all([
            listInternalAdminUsers(userQuery),
            getAdminUserStats(),
          ]);
          setUsers(usersData);
          setUserStats(stats);
          break;
        }
        case 'tools': {
          const analytics = await getAdminToolAnalytics();
          setToolAnalytics(analytics);
          break;
        }
        case 'ratings': {
          const ratings = await getAdminRatingsDetail(ratingsPage, 20, ratingsToolFilter);
          setRatingsDetail(ratings);
          break;
        }
        case 'contacts': {
          const contactsData = await getInternalAdminContacts(contactMeta.page, contactMeta.perPage);
          setContacts(contactsData.items);
          setContactMeta({
            total: contactsData.total,
            unread: contactsData.unread,
            page: contactsData.page,
            perPage: contactsData.per_page,
          });
          break;
        }
        case 'system': {
          const [health, pi] = await Promise.all([
            getAdminSystemHealth(),
            getAdminPlanInterest(),
          ]);
          setSystemHealth(health);
          setPlanInterest(pi);
          break;
        }
        case 'database': {
          const dbStats = await getDatabaseStats();
          setDatabaseStats(dbStats);
          break;
        }
        case 'events': {
          const events = await getProjectEvents(eventsDays);
          setProjectEvents(events);
          break;
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('loadError');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    setError(null);
    try {
      const authenticatedUser = await login(email, password);
      if (authenticatedUser.role !== 'admin') {
        setLoginError('This account does not have internal admin access.');
      }
      setPassword('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('loginError');
      setLoginError(msg);
      toast.error(msg);
    }
  }

  async function handlePlanChange(userId: number, plan: 'free' | 'pro') {
    if (!isAdmin) return;
    setUpdatingUserId(userId);
    setError(null);
    try {
      await updateAdminUserPlan(userId, plan);
      await loadTab('users');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('updatePlanError');
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleRoleChange(userId: number, role: 'user' | 'admin') {
    if (!isAdmin) return;
    setUpdatingRoleUserId(userId);
    setError(null);
    try {
      await updateAdminUserRole(userId, role);
      await loadTab('users');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('updateRoleError');
      setError(msg);
      toast.error(msg);
    } finally {
      setUpdatingRoleUserId(null);
    }
  }

  async function handleMarkRead(messageId: number) {
    if (!isAdmin) return;
    setMarkingMessageId(messageId);
    setError(null);
    try {
      await markInternalAdminContactRead(messageId);
      await loadTab('contacts');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('updateContactError');
      setError(msg);
      toast.error(msg);
    } finally {
      setMarkingMessageId(null);
    }
  }

  async function handleLogout() {
    setError(null);
    setLoginError(null);
    await logout();
  }

  // ====================== RENDER HELPERS ======================

  const overviewCards = useMemo(() => {
    if (!overview) return [];
    return [
      {
        key: 'users',
        title: t('totalUsers'),
        value: overview.users.total.toLocaleString(),
        caption: tr(t('proFreeCaption'), { pro: overview.users.pro, free: overview.users.free }),
        icon: Users,
      },
      {
        key: 'processing',
        title: t('filesProcessed'),
        value: overview.processing.total_files_processed.toLocaleString(),
        caption: `${overview.processing.files_last_24h} ${t('inLast24h')}`,
        icon: BarChart3,
      },
      {
        key: 'success',
        title: t('successRate'),
        value: `${overview.processing.success_rate}%`,
        caption: `${overview.processing.failed_files} ${t('failuresTracked')}`,
        icon: ShieldCheck,
      },
      {
        key: 'contacts',
        title: t('unreadContacts'),
        value: overview.contacts.unread_messages.toLocaleString(),
        caption: `${overview.contacts.total_messages} ${t('totalInboxItems')}`,
        icon: Inbox,
      },
      {
        key: 'ai-cost',
        title: t('aiSpend'),
        value: formatMoney(overview.ai_cost.total_usd),
        caption: tr(t('ofBudget'), { pct: overview.ai_cost.percent_used, budget: formatMoney(overview.ai_cost.budget_usd) }),
        icon: Zap,
      },
      {
        key: 'ratings',
        title: t('averageRating'),
        value: overview.ratings.average_rating.toFixed(1),
        caption: `${overview.ratings.rating_count} ${t('ratingsCollected')}`,
        icon: Star,
      },
      ...(planInterest
        ? [
            {
              key: 'plan-interest',
              title: t('upgradeClicks'),
              value: planInterest.total_clicks.toLocaleString(),
              caption: tr(t('last7dSuffix'), { clicks: planInterest.clicks_last_7d, unique: planInterest.unique_users }),
              icon: DollarSign,
            },
          ]
        : []),
      ...(systemHealth
        ? [
            {
              key: 'ai-status',
              title: t('aiStatus'),
              value: systemHealth.ai_configured ? t('active') : t('notConfigured'),
              caption: systemHealth.ai_configured ? tr(t('modelLabel'), { model: systemHealth.ai_model }) : t('checkKey'),
              icon: Activity,
            },
          ]
        : []),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview, planInterest, systemHealth, lang]);

  function renderOverviewTab() {
    return (
      <>
        {/* Metric cards */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.key}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
                    <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{card.caption}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* Top tools + recent failures */}
        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('topTools')}</h2>
            <div className="mt-5 space-y-3">
              {overview?.top_tools.length ? (
                overview.top_tools.map((tool) => (
                  <div key={tool.tool} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{tool.tool}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tool.total_runs} {t('totalRunsSuffix')}</p>
                      </div>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                        {tool.failed_runs} {t('failedBadge')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">{t('noToolActivity')}</p>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('recentFailures')}</h2>
            <div className="mt-5 space-y-3">
              {overview?.recent_failures.length ? (
                overview.recent_failures.map((failure) => (
                  <div
                    key={failure.id}
                    className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-500/10"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{failure.tool}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {failure.original_filename || t('unknownFile')}
                          {failure.email ? ` / ${failure.email}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{failure.created_at}</span>
                    </div>
                    <p className="mt-3 text-sm text-rose-700 dark:text-rose-200">
                      {typeof failure.metadata.error === 'string'
                        ? failure.metadata.error
                        : t('processingFailed')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">{t('noRecentFailures')}</p>
              )}
            </div>
          </article>
        </section>

        {/* Recent users */}
        {overview?.recent_users.length ? (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('latestRegistrations')}</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-3 pe-4 font-medium">{t('emailCol')}</th>
                    <th className="py-3 pe-4 font-medium">{t('planCol')}</th>
                    <th className="py-3 pe-4 font-medium">{t('tasksCol')}</th>
                    <th className="py-3 font-medium">{t('joinedCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {overview.recent_users.map((u) => (
                    <tr key={u.id} className="text-slate-700 dark:text-slate-200">
                      <td className="py-3 pe-4 font-medium">{u.email}</td>
                      <td className="py-3 pe-4 capitalize">{u.plan}</td>
                      <td className="py-3 pe-4">{u.total_tasks}</td>
                      <td className="py-3 text-xs text-slate-500 dark:text-slate-400">{u.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ) : null}
      </>
    );
  }

  function renderUsersTab() {
    return (
      <>
        {/* Registration stats */}
        {userStats && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { key: 'total', title: t('totalUsers'), value: userStats.total_users },
              { key: 'new7', title: t('newLast7d'), value: userStats.new_last_7d },
              { key: 'new30', title: t('newLast30d'), value: userStats.new_last_30d },
              { key: 'pro', title: t('proUsers'), value: userStats.pro_users },
            ].map((s) => (
              <article
                key={s.key}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
              >
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{s.title}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{s.value.toLocaleString()}</p>
              </article>
            ))}
          </section>
        )}

        {/* Registration chart (simple bar representation) */}
        {userStats && userStats.daily_registrations.length > 0 && (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('dailyReg30d')}</h2>
            <div className="mt-5 flex items-end gap-1 overflow-x-auto" style={{ height: 120 }}>
              {(() => {
                const maxCount = Math.max(...userStats.daily_registrations.map((d) => d.count), 1);
                return userStats.daily_registrations.map((d) => (
                  <div key={d.day} className="group relative flex flex-col items-center" style={{ minWidth: 16 }}>
                    <div
                      className="w-3 rounded-t bg-primary-500 transition-all group-hover:bg-primary-600"
                      style={{ height: `${Math.max((d.count / maxCount) * 100, 4)}%` }}
                      title={`${d.day}: ${d.count}`}
                    />
                    <span className="mt-1 hidden text-[9px] text-slate-400 group-hover:block">{d.count}</span>
                  </div>
                ));
              })()}
            </div>
          </article>
        )}

        {/* User management table */}
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('userManagement')}</h2>
            <div className="flex w-full max-w-md items-center gap-2">
              <form
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  void loadTab('users');
                }}
                className="flex flex-1 items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder={t('searchEmailPlaceholder')}
                    className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 ps-10 pe-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-primary-500/30"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
                >
                  {t('searchBtn')}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowCreateUser(true)}
                className="shrink-0 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                {t('createUser')}
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-3 pe-4 font-medium">{t('emailCol')}</th>
                  <th className="py-3 pe-4 font-medium">{t('roleCol')}</th>
                  <th className="py-3 pe-4 font-medium">{t('planCol')}</th>
                  <th className="py-3 pe-4 font-medium">{t('tasksCol')}</th>
                  <th className="py-3 pe-4 font-medium">{t('apiKeysCol')}</th>
                  <th className="py-3 font-medium">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="text-slate-700 dark:text-slate-200">
                    <td className="py-4 pe-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{u.email}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr(t('createdLabel'), { date: u.created_at })}</div>
                    </td>
                    <td className="py-4 pe-4">
                      <div className="flex flex-col gap-1">
                        <span className="capitalize">{u.role}</span>
                        {u.is_allowlisted_admin && (
                          <span className="text-xs text-primary-700 dark:text-primary-300">{t('allowlisted')}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pe-4 capitalize">{u.plan}</td>
                    <td className="py-4 pe-4">{tr(t('tasksSummary'), { ok: u.completed_tasks, fail: u.failed_tasks })}</td>
                    <td className="py-4 pe-4">{u.active_api_keys}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={updatingUserId === u.id || u.plan === 'free'}
                          onClick={() => void handlePlanChange(u.id, 'free')}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
                        >
                          {t('btnFree')}
                        </button>
                        <button
                          type="button"
                          disabled={updatingUserId === u.id || u.plan === 'pro'}
                          onClick={() => void handlePlanChange(u.id, 'pro')}
                          className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t('btnPro')}
                        </button>
                        <button
                          type="button"
                          disabled={u.is_allowlisted_admin || updatingRoleUserId === u.id || u.role === 'user'}
                          onClick={() => void handleRoleChange(u.id, 'user')}
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
                        >
                          {t('btnUser')}
                        </button>
                        <button
                          type="button"
                          disabled={u.is_allowlisted_admin || updatingRoleUserId === u.id || u.role === 'admin'}
                          onClick={() => void handleRoleChange(u.id, 'admin')}
                          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          {t('btnAdmin')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteUser(u.id)}
                          className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-500/20"
                        >
                          {t('deleteUser')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* Most active users */}
        {userStats && userStats.most_active_users.length > 0 && (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('mostActiveUsers')}</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-3 pe-4 font-medium">{t('emailCol')}</th>
                    <th className="py-3 pe-4 font-medium">{t('planCol')}</th>
                    <th className="py-3 pe-4 font-medium">{t('totalTasksCol')}</th>
                    <th className="py-3 font-medium">{t('joinedCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {userStats.most_active_users.map((u) => (
                    <tr key={u.id} className="text-slate-700 dark:text-slate-200">
                      <td className="py-3 pe-4 font-medium">{u.email}</td>
                      <td className="py-3 pe-4 capitalize">{u.plan}</td>
                      <td className="py-3 pe-4 font-semibold">{u.total_tasks.toLocaleString()}</td>
                      <td className="py-3 text-xs text-slate-500 dark:text-slate-400">{u.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </>
    );
  }

  function renderToolsTab() {
    if (!toolAnalytics) return <p className="text-sm text-slate-600 dark:text-slate-300">{t('loadingText')}</p>;
    return (
      <>
        {/* Per-tool analytics */}
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('toolUsageBreakdown')}</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('toolUsageDesc')}</p>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-3 pe-3 font-medium">{t('toolCol')}</th>
                  <th className="py-3 pe-3 font-medium">{t('totalCol')}</th>
                  <th className="py-3 pe-3 font-medium">{t('successCol')}</th>
                  <th className="py-3 pe-3 font-medium">{t('rateCol')}</th>
                  <th className="py-3 pe-3 font-medium">24h</th>
                  <th className="py-3 pe-3 font-medium">7d</th>
                  <th className="py-3 pe-3 font-medium">30d</th>
                  <th className="py-3 font-medium">{t('usersCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {toolAnalytics.tools.map((t_) => (
                  <tr key={t_.tool} className="text-slate-700 dark:text-slate-200">
                    <td className="py-3 pe-3 font-semibold text-slate-900 dark:text-white">{t_.tool}</td>
                    <td className="py-3 pe-3">{t_.total_runs.toLocaleString()}</td>
                    <td className="py-3 pe-3">
                      <span className="text-emerald-600 dark:text-emerald-400">{t_.completed.toLocaleString()}</span>
                      {' / '}
                      <span className="text-rose-600 dark:text-rose-400">{t_.failed.toLocaleString()}</span>
                    </td>
                    <td className="py-3 pe-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          t_.success_rate >= 90
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : t_.success_rate >= 70
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                        }`}
                      >
                        {t_.success_rate}%
                      </span>
                    </td>
                    <td className="py-3 pe-3">{t_.runs_24h}</td>
                    <td className="py-3 pe-3">{t_.runs_7d}</td>
                    <td className="py-3 pe-3">{t_.runs_30d}</td>
                    <td className="py-3">{t_.unique_users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* Daily usage chart */}
        {toolAnalytics.daily_usage.length > 0 && (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('dailyProcessing30d')}</h2>
            <div className="mt-5 flex items-end gap-1 overflow-x-auto" style={{ height: 140 }}>
              {(() => {
                const maxVal = Math.max(...toolAnalytics.daily_usage.map((d) => d.total), 1);
                return toolAnalytics.daily_usage.map((d) => (
                  <div key={d.day} className="group relative flex flex-col items-center" style={{ minWidth: 18 }}>
                    <div className="flex w-4 flex-col rounded-t overflow-hidden" style={{ height: `${Math.max((d.total / maxVal) * 120, 4)}px` }}>
                      <div className="bg-emerald-500" style={{ flex: d.completed }} />
                      <div className="bg-rose-500" style={{ flex: d.failed || 0.001 }} />
                    </div>
                    <span className="mt-1 hidden text-[9px] text-slate-400 group-hover:block">{d.total}</span>
                  </div>
                ));
              })()}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t('completedLabel')}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> {t('failedLabel')}
              </span>
            </div>
          </article>
        )}

        {/* Common errors */}
        {toolAnalytics.common_errors.length > 0 && (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('mostCommonErrors30d')}</h2>
            <div className="mt-5 space-y-3">
              {toolAnalytics.common_errors.map((err, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-500/10"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{err.tool}</p>
                      <p className="mt-1 text-sm text-rose-700 dark:text-rose-200">{err.error}</p>
                    </div>
                    <span className="rounded-full bg-rose-200 px-3 py-1 text-xs font-bold text-rose-800 dark:bg-rose-500/20 dark:text-rose-200">
                      {err.occurrences}x
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}
      </>
    );
  }

  function renderRatingsTab() {
    return (
      <>
        {/* Per-tool summaries */}
        {ratingsDetail && ratingsDetail.tool_summaries.length > 0 && (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('ratingSummaryByTool')}</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ratingsDetail.tool_summaries.map((ts) => (
                <div
                  key={ts.tool}
                  className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                    ratingsToolFilter === ts.tool
                      ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-500/10'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                  onClick={() => {
                    setRatingsToolFilter(ratingsToolFilter === ts.tool ? '' : ts.tool);
                    setRatingsPage(1);
                    void getAdminRatingsDetail(1, 20, ratingsToolFilter === ts.tool ? '' : ts.tool).then(setRatingsDetail);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{ts.tool}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{ts.count} {t('ratingsCountSuffix')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{ts.average}</p>
                      <div className="mt-1 flex gap-2 text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400">{ts.positive} {t('positiveLabel')}</span>
                        <span className="text-rose-600 dark:text-rose-400">{ts.negative} {t('negativeLabel')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}

        {/* Individual ratings */}
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {ratingsToolFilter ? tr(t('reviewsFilterLabel'), { tool: ratingsToolFilter }) : t('allReviews')}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {tr(t('totalRatingsLabel'), { n: ratingsDetail?.total ?? 0 })}
                {ratingsToolFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setRatingsToolFilter('');
                      setRatingsPage(1);
                      void getAdminRatingsDetail(1, 20, '').then(setRatingsDetail);
                    }}
                    className="ms-2 text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {t('clearFilter')}
                  </button>
                )}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {ratingsDetail?.items.length ? (
              ratingsDetail.items.map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900 dark:text-white">{r.tool}</span>
                        <StarDisplay rating={r.rating} />
                      </div>
                      {r.feedback && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          <MessageSquare className="me-1 inline h-3.5 w-3.5" />
                          {r.feedback}
                        </p>
                      )}
                      {r.tag && (
                        <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {r.tag}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{r.created_at}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300">{t('noRatingsFound')}</p>
            )}
          </div>

          {/* Pagination */}
          {ratingsDetail && ratingsDetail.total > ratingsDetail.per_page && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={ratingsPage <= 1}
                onClick={() => {
                  const p = ratingsPage - 1;
                  setRatingsPage(p);
                  void getAdminRatingsDetail(p, 20, ratingsToolFilter).then(setRatingsDetail);
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
              >
                {t('previous')}
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {tr(t('pageOf'), { p: ratingsPage, total: Math.ceil(ratingsDetail.total / ratingsDetail.per_page) })}
              </span>
              <button
                type="button"
                disabled={ratingsPage >= Math.ceil(ratingsDetail.total / ratingsDetail.per_page)}
                onClick={() => {
                  const p = ratingsPage + 1;
                  setRatingsPage(p);
                  void getAdminRatingsDetail(p, 20, ratingsToolFilter).then(setRatingsDetail);
                }}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
              >
                {t('next')}
              </button>
            </div>
          )}
        </article>
      </>
    );
  }

  function renderContactsTab() {
    return (
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('contactInbox')}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {tr(t('unreadOfTotal'), { unread: contactMeta.unread, total: contactMeta.total })}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {contacts.length ? (
            contacts.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{c.subject || t('noSubject')}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {c.name} / {c.email} / {c.category}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{c.created_at}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{c.message}</p>
                {!c.is_read ? (
                  <button
                    type="button"
                    disabled={markingMessageId === c.id}
                    onClick={() => void handleMarkRead(c.id)}
                    className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {t('markAsRead')}
                  </button>
                ) : (
                  <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {t('readLabel')}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('noContactMessages')}</p>
          )}
        </div>

        {/* Contact pagination */}
        {contactMeta.total > contactMeta.perPage && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={contactMeta.page <= 1}
              onClick={() => {
                setContactMeta((prev) => ({ ...prev, page: prev.page - 1 }));
                void loadTab('contacts');
              }}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
            >
              {t('previous')}
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {tr(t('pageOf'), { p: contactMeta.page, total: Math.ceil(contactMeta.total / contactMeta.perPage) })}
            </span>
            <button
              type="button"
              disabled={contactMeta.page >= Math.ceil(contactMeta.total / contactMeta.perPage)}
              onClick={() => {
                setContactMeta((prev) => ({ ...prev, page: prev.page + 1 }));
                void loadTab('contacts');
              }}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
            >
              {t('next')}
            </button>
          </div>
        )}
      </article>
    );
  }

  function renderSystemTab() {
    return (
      <>
        {/* System health cards */}
        {systemHealth && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('aiServiceLabel')}</p>
                  <p className={`mt-3 text-2xl font-bold ${systemHealth.ai_configured ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {systemHealth.ai_configured ? t('active') : t('offlineLabel')}
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{systemHealth.ai_model}</p>
                </div>
                <Activity className="h-5 w-5 text-slate-400" />
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('errorRate1h')}</p>
                  <p className={`mt-3 text-2xl font-bold ${systemHealth.error_rate_1h > 20 ? 'text-rose-600' : systemHealth.error_rate_1h > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {systemHealth.error_rate_1h}%
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {tr(t('failedOfTotal'), { fail: systemHealth.failures_last_1h, total: systemHealth.tasks_last_1h })}
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-slate-400" />
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('aiBudgetUsed')}</p>
                  <p className={`mt-3 text-2xl font-bold ${systemHealth.ai_budget_used_percent > 80 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                    {systemHealth.ai_budget_used_percent}%
                  </p>
                </div>
                <DollarSign className="h-5 w-5 text-slate-400" />
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('databaseSize')}</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{systemHealth.database_size_mb} MB</p>
                </div>
                <Database className="h-5 w-5 text-slate-400" />
              </div>
            </article>
          </section>
        )}

        {/* Plan interest */}
        {planInterest && (
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-start gap-3">
              <Heart className="mt-1 h-5 w-5 text-primary-500" />
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('paidPlanInterest')}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('paidPlanInterestDesc')}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {[
                { label: t('totalClicksLabel'), value: planInterest.total_clicks },
                { label: t('uniqueUsersLabel'), value: planInterest.unique_users },
                { label: t('last7DaysLabel'), value: planInterest.clicks_last_7d },
                { label: t('last30DaysLabel'), value: planInterest.clicks_last_30d },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-200 p-4 text-center dark:border-slate-700">
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value.toLocaleString()}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            {planInterest.by_plan.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('byPlanBilling')}</h3>
                <div className="mt-3 flex flex-wrap gap-3">
                  {planInterest.by_plan.map((bp, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-200"
                    >
                      {bp.plan} ({bp.billing}): {bp.clicks} {t('clicksSuffix')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {planInterest.recent.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('recentInterest')}</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-2 pe-3 font-medium">{t('userCol')}</th>
                        <th className="py-2 pe-3 font-medium">{t('planCol')}</th>
                        <th className="py-2 pe-3 font-medium">{t('billingCol')}</th>
                        <th className="py-2 font-medium">{t('dateCol')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {planInterest.recent.map((r) => (
                        <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                          <td className="py-2 pe-3">{r.email ?? t('anonymousLabel')}</td>
                          <td className="py-2 pe-3 capitalize">{r.plan}</td>
                          <td className="py-2 pe-3 capitalize">{r.billing}</td>
                          <td className="py-2 text-xs text-slate-500 dark:text-slate-400">{r.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </article>
        )}
      </>
    );
  }

  // ====================== DATABASE TAB ======================

  function renderDatabaseTab() {
    if (!databaseStats) return null;

    return (
      <>
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Database Type</p>
                <p className="mt-3 text-2xl font-bold capitalize text-slate-900 dark:text-white">{databaseStats.database_type}</p>
              </div>
              <Database className="h-5 w-5 text-slate-400" />
            </div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tables</p>
                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{databaseStats.table_count}</p>
              </div>
              <Database className="h-5 w-5 text-slate-400" />
            </div>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Rows</p>
                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                  {databaseStats.tables.reduce((sum, t) => sum + t.row_count, 0).toLocaleString()}
                </p>
              </div>
              <Database className="h-5 w-5 text-slate-400" />
            </div>
          </article>
        </section>

        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tables</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-2 pe-3 font-medium">Table Name</th>
                  <th className="py-2 pe-3 font-medium">Row Count</th>
                  {databaseStats.tables[0]?.total_size_kb !== undefined && (
                    <th className="py-2 pe-3 font-medium">Size (KB)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {databaseStats.tables.map((table) => (
                  <tr key={table.table_name} className="text-slate-700 dark:text-slate-200">
                    <td className="py-2 pe-3 font-mono text-xs">{table.table_name}</td>
                    <td className="py-2 pe-3">{table.row_count.toLocaleString()}</td>
                    {table.total_size_kb !== undefined && (
                      <td className="py-2 pe-3">{table.total_size_kb.toLocaleString()} KB</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </>
    );
  }

  // ====================== EVENTS TAB ======================

  function renderEventsTab() {
    if (!projectEvents) return null;

    const eventColors: Record<string, string> = {
      user_registered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
      file_processed: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
      file_failed: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
      contact_message: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    };

    const eventIcons: Record<string, typeof Activity> = {
      user_registered: Users,
      file_processed: Zap,
      file_failed: AlertTriangle,
      contact_message: MessageSquare,
    };

    return (
      <>
        {/* Summary cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('totalEvents')}</p>
                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{projectEvents.total_events.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-5 w-5 text-slate-400" />
            </div>
          </article>
          {Object.entries(projectEvents.summary).map(([type, count]) => {
            const Icon = eventIcons[type] || Activity;
            return (
              <article key={type} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {t(`event${type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`)}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{count.toLocaleString()}</p>
                  </div>
                  <Icon className="h-5 w-5 text-slate-400" />
                </div>
              </article>
            );
          })}
        </section>

        {/* Period selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">{t('periodDays').replace('{days}', String(eventsDays))}</span>
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => { setEventsDays(d); void loadTab('events'); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                eventsDays === d
                  ? 'bg-primary-600 text-white'
                  : 'border border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:text-slate-300'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Events timeline */}
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('eventsTimeline')}</h2>
          <div className="mt-4 space-y-3">
            {projectEvents.events.length === 0 ? (
              <p className="py-8 text-center text-slate-500 dark:text-slate-400">No events found.</p>
            ) : (
              projectEvents.events.map((event, i) => {
                const Icon = eventIcons[event.type] || Activity;
                const colorClass = eventColors[event.type] || 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300';
                return (
                  <div key={`${event.entity_id}-${i}`} className="flex items-start gap-4 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
                          {t(`event${event.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-700 dark:text-slate-200">{event.detail}</p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{new Date(event.time).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </>
    );
  }

  // ====================== CREATE USER MODAL ======================

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();
    if (!newUserEmail || !newUserPassword) return;
    try {
      await createAdminUser(newUserEmail, newUserPassword, newUserPlan, newUserRole);
      toast.success(t('userCreated'));
      setShowCreateUser(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserPlan('free');
      setNewUserRole('user');
      void loadTab('users');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('loadError');
      toast.error(msg);
    }
  }

  async function handleDeleteUser(userId: number) {
    if (!confirm(t('deleteUserConfirm'))) return;
    try {
      await deleteAdminUser(userId);
      toast.success(t('userDeleted'));
      void loadTab('users');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('loadError');
      toast.error(msg);
    }
  }

  async function handleUpdateUserPlan(userId: number, plan: string) {
    try {
      await updateAdminUserPlan(userId, plan);
      toast.success(t('planUpdated'));
      void loadTab('users');
    } catch (e) {
      toast.error(t('updatePlanError'));
    }
  }

  async function handleUpdateUserRole(userId: number, role: string) {
    try {
      await updateAdminUserRole(userId, role);
      toast.success(t('roleUpdated'));
      void loadTab('users');
    } catch (e) {
      toast.error(t('updateRoleError'));
    }
  }

  // ====================== MAIN RENDER ======================

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} lang={lang} className="mx-auto max-w-7xl space-y-6">
      <Helmet>
        <title>{t('pageTitle')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Header */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
              {t('internalOps')}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{t('controlRoom')}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t('controlRoomDesc')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-600 dark:text-slate-200"
            >
              <Globe className="h-4 w-4" />
              {lang === 'en' ? 'العربية' : 'English'}
            </button>

            {user && (
              <div className="flex flex-col items-end gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/50">
                <span className="font-semibold text-slate-900 dark:text-white">{user.email}</span>
                <span className="text-slate-600 dark:text-slate-300">{t('roleLabel')} {user.role}</span>
              </div>
            )}
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadTab(activeTab)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-600 dark:text-slate-200"
                >
                  <RefreshCcw className={`h-4 w-4${loading ? ' animate-spin' : ''}`} />
                  {t('refresh')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <LogOut className="h-4 w-4" />
                  {t('signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Auth state */}
      {!initialized || authLoading ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          {t('checkingSession')}
        </section>
      ) : !user ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="max-w-lg">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('adminSignIn')}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t('adminSignInDesc')}
            </p>
          </div>
          <form onSubmit={handleLogin} className="mt-6 grid gap-4 md:max-w-xl">
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-primary-500/30"
            />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-primary-500/30"
            />
            {loginError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              {t('signInBtn')}
            </button>
          </form>
        </section>
      ) : !isAdmin ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('noAdminPermission')}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            {tr(t('notAdminDesc'), { email: user.email })}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/account"
              className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-600 dark:text-slate-200"
            >
              {t('backToAccount')}
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <LogOut className="h-4 w-4" />
              {t('signOut')}
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Tab navigation */}
          <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    activeTab === tab.key
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Tab content */}
          <div className="space-y-6">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'users' && renderUsersTab()}
            {activeTab === 'tools' && renderToolsTab()}
            {activeTab === 'ratings' && renderRatingsTab()}
            {activeTab === 'contacts' && renderContactsTab()}
            {activeTab === 'system' && renderSystemTab()}
            {activeTab === 'database' && renderDatabaseTab()}
            {activeTab === 'events' && renderEventsTab()}
          </div>
        </>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateUser(false)}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('createUserTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('createUserDesc')}</p>
            <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('emailLabel')}</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('passwordLabel')}</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('planLabel')}</label>
                  <select
                    value={newUserPlan}
                    onChange={(e) => setNewUserPlan(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('roleLabel')}</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  {t('createBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-600 dark:text-slate-200"
                >
                  {t('cancelBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

