import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, LayoutGrid, Sparkles, Tag, User } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    {
      label: t('nav.home', 'Home'),
      path: '/',
      icon: Home,
    },
    {
      label: t('nav.tools', 'Tools'),
      path: '/tools',
      icon: LayoutGrid,
    },
    {
      label: t('nav.ai', 'AI'),
      path: '/tools?group=ai-workspace',
      icon: Sparkles,
      premium: true,
    },
    {
      label: t('nav.pricing', 'Pricing'),
      path: '/pricing',
      icon: Tag,
    },
    {
      label: t('nav.account', 'Account'),
      path: '/account',
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block border-t border-zinc-200 bg-white/80 bottom-safe backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = item.path.includes('?')
            ? location.pathname + location.search === item.path
            : location.pathname === item.path;
          const Icon = item.icon;
          const isPremium = 'premium' in item && item.premium;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors',
                isActive
                  ? isPremium
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-brand-600 dark:text-brand-400'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'animate-in zoom-in-75 duration-300')} />
              <span className={cn(
                'text-[10px] font-medium tracking-tight',
                isPremium && !isActive && 'text-violet-500 dark:text-violet-400'
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className={cn(
                  'absolute bottom-1 h-1 w-1 rounded-full',
                  isPremium ? 'bg-violet-600 dark:bg-violet-400' : 'bg-brand-600 dark:bg-brand-400'
                )} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
