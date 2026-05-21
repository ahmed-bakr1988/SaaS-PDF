import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  FolderClock, 
  KeyRound, 
  LayoutDashboard, 
  Settings,
  LogOut,
  User
} from 'lucide-react';
import { cn } from '@/utils/cn';

export type AccountTab = 'overview' | 'history' | 'usage' | 'api-keys' | 'settings';

interface AccountSidebarProps {
  activeTab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
  onLogout: () => void;
  userEmail?: string;
  isPro?: boolean;
  profilePictureUrl?: string | null;
}

export default function AccountSidebar({ 
  activeTab, 
  onTabChange, 
  onLogout,
  userEmail,
  isPro,
  profilePictureUrl
}: AccountSidebarProps) {
  const { t } = useTranslation();

  interface MenuItem {
    id: AccountTab;
    label: string;
    icon: React.ElementType;
    proOnly?: boolean;
  }

  const menuItems: MenuItem[] = [
    { id: 'overview',  label: t('account.tabOverview', 'Overview'),    icon: LayoutDashboard },
    { id: 'history',   label: t('account.tabHistory',  'History'),     icon: FolderClock },
    { id: 'usage',     label: t('account.tabUsage',    'Usage Stats'), icon: BarChart3 },
    { id: 'api-keys',  label: t('account.tabApiKeys',  'API Keys'),    icon: KeyRound, proOnly: true },
    { id: 'settings',  label: t('account.tabSettings', 'Settings'),    icon: Settings },
  ];

  return (
    <aside className="w-full shrink-0 md:w-64 lg:w-72">
      <div className="sticky top-24 space-y-6">
        {/* User Brief */}
        <div className="premium-card !p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden ring-2 ring-zinc-50 dark:ring-zinc-800">
              {profilePictureUrl ? (
                <img src={profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-zinc-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
                {userEmail}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {isPro ? t('account.proPlan', 'Pro Plan') : t('account.freePlan', 'Free Plan')}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            if (item.proOnly && !isPro) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as AccountTab)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all',
                  isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-zinc-400')} />
                {item.label}
              </button>
            );
          })}

          <div className="pt-4">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-5 w-5" />
              {t('account.logout', 'Sign out')}
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}
