import { FolderClock, KeyRound, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const workflowCards = [
  {
    key: 'history',
    icon: FolderClock,
    titleKey: 'account.onboardingFirstTaskTitle',
    descriptionKey: 'account.onboardingFirstTaskDesc',
    href: '/account',
    ctaKey: 'common.account',
  },
  {
    key: 'limits',
    icon: ShieldCheck,
    titleKey: 'account.onboardingUpgradeTitle',
    descriptionKey: 'account.onboardingUpgradeDesc',
    href: '/pricing',
    ctaKey: 'common.pricing',
  },
  {
    key: 'api',
    icon: KeyRound,
    titleKey: 'account.onboardingApiTitle',
    descriptionKey: 'account.onboardingApiDesc',
    href: '/developers',
    ctaKey: 'pages.developers.getApiKey',
  },
] as const;

export default function ToolWorkflowPanel() {
  const { t } = useTranslation();

  return (
    <section className="mb-12 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-700 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
            {t('account.onboardingTitle')}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {t('account.onboardingSubtitle')}
          </h2>
        </div>
        <Link
          to="/account"
          className="inline-flex items-center justify-center rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          {t('common.account')}
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {workflowCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.key}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-200">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                {t(card.titleKey)}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t(card.descriptionKey)}
              </p>
              <Link
                to={card.href}
                className="mt-4 inline-flex items-center text-sm font-semibold text-primary-700 transition-colors hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200"
              >
                {t(card.ctaKey)}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}