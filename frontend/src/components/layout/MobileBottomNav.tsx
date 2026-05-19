import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, LayoutGrid, User, Settings } from 'lucide-react';
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
      label: t('nav.account', 'Account'),
      path: '/account',
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block border-t border-zinc-200 bg-white/80 pb-safe-area-inset-bottom backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full gap-1 transition-colors',
                isActive 
                  ? 'text-brand-600 dark:text-brand-400' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'animate-in zoom-in-75 duration-300')} />
              <span className="text-[10px] font-medium tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-600 dark:bg-brand-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
