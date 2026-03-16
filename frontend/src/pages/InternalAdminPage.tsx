import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Inbox,
  LogOut,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import {
  getInternalAdminContacts,
  getInternalAdminOverview,
  listInternalAdminUsers,
  markInternalAdminContactRead,
  updateInternalAdminUserRole,
  updateInternalAdminUserPlan,
  type InternalAdminContact,
  type InternalAdminOverview,
  type InternalAdminUser,
} from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function InternalAdminPage() {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const authLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [overview, setOverview] = useState<InternalAdminOverview | null>(null);
  const [users, setUsers] = useState<InternalAdminUser[]>([]);
  const [contacts, setContacts] = useState<InternalAdminContact[]>([]);
  const [contactMeta, setContactMeta] = useState({ total: 0, unread: 0, page: 1, perPage: 12 });
  const [userQuery, setUserQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<number | null>(null);
  const [markingMessageId, setMarkingMessageId] = useState<number | null>(null);

  const isAdmin = user?.role === 'admin';

  const metricCards = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      {
        key: 'users',
        title: 'Total users',
        value: overview.users.total.toLocaleString(),
        caption: `${overview.users.pro} pro / ${overview.users.free} free`,
        icon: Users,
      },
      {
        key: 'processing',
        title: 'Files processed',
        value: overview.processing.total_files_processed.toLocaleString(),
        caption: `${overview.processing.files_last_24h} in the last 24h`,
        icon: BarChart3,
      },
      {
        key: 'success',
        title: 'Success rate',
        value: `${overview.processing.success_rate}%`,
        caption: `${overview.processing.failed_files} failures tracked`,
        icon: ShieldCheck,
      },
      {
        key: 'contacts',
        title: 'Unread contacts',
        value: overview.contacts.unread_messages.toLocaleString(),
        caption: `${overview.contacts.total_messages} total inbox items`,
        icon: Inbox,
      },
      {
        key: 'ai-cost',
        title: 'AI spend',
        value: formatMoney(overview.ai_cost.total_usd),
        caption: `${overview.ai_cost.percent_used}% of ${formatMoney(overview.ai_cost.budget_usd)} budget`,
        icon: Zap,
      },
      {
        key: 'ratings',
        title: 'Average rating',
        value: overview.ratings.average_rating.toFixed(1),
        caption: `${overview.ratings.rating_count} ratings collected`,
        icon: RefreshCcw,
      },
    ];
  }, [overview]);

  useEffect(() => {
    if (!isAdmin) {
      setOverview(null);
      setUsers([]);
      setContacts([]);
      return;
    }

    void loadDashboard(userQuery);
  }, [isAdmin]);

  async function loadDashboard(query = '') {
    setLoading(true);
    setError(null);

    try {
      const [overviewData, usersData, contactsData] = await Promise.all([
        getInternalAdminOverview(),
        listInternalAdminUsers(query),
        getInternalAdminContacts(1, 12),
      ]);

      setOverview(overviewData);
      setUsers(usersData);
      setContacts(contactsData.items);
      setContactMeta({
        total: contactsData.total,
        unread: contactsData.unread,
        page: contactsData.page,
        perPage: contactsData.per_page,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load internal admin dashboard.');
      setOverview(null);
      setUsers([]);
      setContacts([]);
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
    } catch (loginAttemptError) {
      setLoginError(loginAttemptError instanceof Error ? loginAttemptError.message : 'Unable to sign in.');
    }
  }

  async function handleRefresh() {
    if (!isAdmin) {
      return;
    }
    await loadDashboard(userQuery);
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) {
      return;
    }
    await loadDashboard(userQuery);
  }

  async function handlePlanChange(userId: number, plan: 'free' | 'pro') {
    if (!isAdmin) {
      return;
    }

    setUpdatingUserId(userId);
    setError(null);
    try {
      await updateInternalAdminUserPlan(userId, plan);
      await loadDashboard(userQuery);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update plan.');
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function handleMarkRead(messageId: number) {
    if (!isAdmin) {
      return;
    }

    setMarkingMessageId(messageId);
    setError(null);
    try {
      await markInternalAdminContactRead(messageId);
      await loadDashboard(userQuery);
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Unable to update contact message.');
    } finally {
      setMarkingMessageId(null);
    }
  }

  async function handleRoleChange(userId: number, role: 'user' | 'admin') {
    if (!isAdmin) {
      return;
    }

    setUpdatingRoleUserId(userId);
    setError(null);
    try {
      await updateInternalAdminUserRole(userId, role);
      await loadDashboard(userQuery);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update role.');
    } finally {
      setUpdatingRoleUserId(null);
    }
  }

  async function handleLogout() {
    setError(null);
    setLoginError(null);
    await logout();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <Helmet>
        <title>Internal Admin | SaaS PDF</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
              Internal operations
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
              Admin control room
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              This area now uses the normal app session plus admin permissions. Only signed-in allowlisted admins can
              inspect operations, edit plans, and process the support inbox.
            </p>
          </div>

          {user ? (
            <div className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/50">
              <span className="font-semibold text-slate-900 dark:text-white">{user.email}</span>
              <span className="text-slate-600 dark:text-slate-300">Role: {user.role}</span>
            </div>
          ) : null}
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!initialized || authLoading ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          Checking admin session...
        </section>
      ) : !user ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="max-w-lg">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin sign in</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Use an allowlisted internal account to start a normal authenticated session. Admin access is decided by
              server-side permissions, not a client-side secret.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-6 grid gap-4 md:max-w-xl">
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-primary-500/30"
            />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
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
              Sign in as admin
            </button>
          </form>
        </section>
      ) : !isAdmin ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No admin permission</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-300">
            You are signed in as {user.email}, but this account is not in the internal admin allowlist and does not
            carry the admin role.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/account"
              className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
            >
              Back to account
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metricCards.map((card) => {
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

          <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-6">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Users and monetization</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Review plan mix, API adoption, and failed task concentration before support tickets pile up.
                    </p>
                  </div>
                  <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={userQuery}
                        onChange={(event) => setUserQuery(event.target.value)}
                        placeholder="Search user email"
                        className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-primary-500/30"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
                    >
                      Search
                    </button>
                  </form>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-700">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-3 pe-4 font-medium">User</th>
                        <th className="py-3 pe-4 font-medium">Role</th>
                        <th className="py-3 pe-4 font-medium">Plan</th>
                        <th className="py-3 pe-4 font-medium">Tasks</th>
                        <th className="py-3 pe-4 font-medium">API keys</th>
                        <th className="py-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {users.map((user) => (
                        <tr key={user.id} className="text-slate-700 dark:text-slate-200">
                          <td className="py-4 pe-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{user.email}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Created {user.created_at}</div>
                          </td>
                          <td className="py-4 pe-4">
                            <div className="flex flex-col gap-1">
                              <span className="capitalize">{user.role}</span>
                              {user.is_allowlisted_admin ? (
                                <span className="text-xs text-primary-700 dark:text-primary-300">Bootstrap allowlist</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-4 pe-4 capitalize">{user.plan}</td>
                          <td className="py-4 pe-4">{user.completed_tasks} complete / {user.failed_tasks} failed</td>
                          <td className="py-4 pe-4">{user.active_api_keys}</td>
                          <td className="py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={updatingUserId === user.id || user.plan === 'free'}
                                onClick={() => void handlePlanChange(user.id, 'free')}
                                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
                              >
                                Set free
                              </button>
                              <button
                                type="button"
                                disabled={updatingUserId === user.id || user.plan === 'pro'}
                                onClick={() => void handlePlanChange(user.id, 'pro')}
                                className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Set pro
                              </button>
                              <button
                                type="button"
                                disabled={user.is_allowlisted_admin || updatingRoleUserId === user.id || user.role === 'user'}
                                onClick={() => void handleRoleChange(user.id, 'user')}
                                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
                              >
                                Set user
                              </button>
                              <button
                                type="button"
                                disabled={user.is_allowlisted_admin || updatingRoleUserId === user.id || user.role === 'admin'}
                                onClick={() => void handleRoleChange(user.id, 'admin')}
                                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                              >
                                Set admin
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent failures</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      These entries help isolate tool instability and prioritize support follow-up.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRefresh()}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
                  >
                    <RefreshCcw className={`h-4 w-4${loading ? ' animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {overview?.recent_failures.length ? overview.recent_failures.map((failure) => (
                    <div
                      key={failure.id}
                      className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4 dark:border-rose-500/20 dark:bg-rose-500/10"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{failure.tool}</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {failure.original_filename || 'Unknown file'}
                            {failure.email ? ` / ${failure.email}` : ''}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{failure.created_at}</span>
                      </div>
                      <p className="mt-3 text-sm text-rose-700 dark:text-rose-200">
                        {typeof failure.metadata.error === 'string' ? failure.metadata.error : 'Processing failed without a structured error message.'}
                      </p>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300">No recent failures.</p>
                  )}
                </div>
              </article>
            </div>

            <div className="space-y-6">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Top tools</h2>
                <div className="mt-5 space-y-3">
                  {overview?.top_tools.length ? overview.top_tools.map((tool) => (
                    <div key={tool.tool} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{tool.tool}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tool.total_runs} total runs</p>
                        </div>
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                          {tool.failed_runs} failed
                        </span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300">No tool activity yet.</p>
                  )}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Contact inbox</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {contactMeta.unread} unread of {contactMeta.total} total messages.
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-500/10 dark:text-primary-200">
                    Page {contactMeta.page}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {contacts.length ? contacts.map((contact) => (
                    <div key={contact.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{contact.subject || 'No subject'}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {contact.name} / {contact.email} / {contact.category}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{contact.created_at}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{contact.message}</p>
                      {!contact.is_read ? (
                        <button
                          type="button"
                          disabled={markingMessageId === contact.id}
                          onClick={() => void handleMarkRead(contact.id)}
                          className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          Mark as read
                        </button>
                      ) : (
                        <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
                          Read
                        </span>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300">No contact messages found.</p>
                  )}
                </div>
              </article>
            </div>
          </section>
        </>
      )}
    </div>
  );
}