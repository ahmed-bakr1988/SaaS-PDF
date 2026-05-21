import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage, getSiteOrigin } from '@/utils/seo';
import { Lightbulb, Shield, Send, Users, FileText, Globe } from 'lucide-react';
import { FILE_RETENTION_MINUTES } from '@/config/toolLimits';

const TEAM_MEMBERS = [
  { nameKey: 'pages.about.team.ceo', nameDefault: 'CEO', role: 'CEO' },
  { nameKey: 'pages.about.team.cto', nameDefault: 'CTO', role: 'CTO' },
  { nameKey: 'pages.about.team.lead', nameDefault: 'Lead Developer', role: 'Lead Developer' },
];

const STATS = [
  { value: '1,000,000+', labelKey: 'pages.about.statsUsers', labelDefault: 'Users Served' },
  { value: '500,000,000+', labelKey: 'pages.about.statsFiles', labelDefault: 'Files Processed' },
  { value: '150+', labelKey: 'pages.about.statsCountries', labelDefault: 'Countries Reached' },
];

const TIMELINE = [
  { year: '2018', labelKey: 'pages.about.timeline2018', labelDefault: 'Founded as DocuFlow' },
  { year: '2020', labelKey: 'pages.about.timeline2020', labelDefault: 'Launched Cloud Platform' },
  { year: '2022', labelKey: 'pages.about.timeline2022', labelDefault: 'Global Expansion' },
  { year: '2024', labelKey: 'pages.about.timeline2024', labelDefault: 'AI Integration' },
];

const VALUES = [
  { icon: Lightbulb, titleKey: 'pages.about.valueInnovation', titleDefault: 'Innovation' },
  { icon: Shield, titleKey: 'pages.about.valueSecurity', titleDefault: 'Security' },
  { icon: Send, titleKey: 'pages.about.valueSimplicity', titleDefault: 'Simplicity' },
];

export default function AboutPage() {
  const { t } = useTranslation();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');

  return (
    <>
      <SEOHead
        title={t('pages.about.title')}
        description={t('pages.about.metaDescription')}
        path="/about"
        jsonLd={generateWebPage({
          name: t('pages.about.title'),
          description: t('pages.about.metaDescription'),
          url: `${siteOrigin}/about`,
        })}
      />

      <div className="mx-auto max-w-6xl">
        {/* Hero Banner */}
        <section className="premium-surface relative mb-16 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 px-8 py-16 text-white shadow-2xl sm:px-12 sm:py-24">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-sky-400/10 blur-[100px]" />
          <h1 className="relative text-4xl font-black uppercase tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            {t('pages.about.heroTitle', 'Empowering Document Productivity Worldwide')}
          </h1>
          <p className="relative mt-6 max-w-2xl text-xl leading-relaxed text-primary-50">
            {t('pages.about.missionText')}
          </p>
        </section>

        {/* Our Team */}
        <section className="mb-16">
          <h2 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
            {t('pages.about.teamTitle', 'Our Team')}
          </h2>
          <div className="flex flex-wrap gap-8">
            {TEAM_MEMBERS.map((member, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 shadow-md dark:bg-primary-900/30">
                  <Users className="h-10 w-10 text-primary-600 dark:text-primary-400" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t(member.nameKey, member.role)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mb-16">
          <div className="grid gap-8 sm:grid-cols-3">
            {STATS.map((stat, idx) => (
              <div
                key={idx}
                className="premium-card flex flex-col items-center text-center"
              >
                {/* Decorative ring */}
                <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full border-[6px] border-primary-50 bg-white shadow-inner dark:border-primary-900/20 dark:bg-slate-800">
                  <span className="text-2xl font-black text-primary-700 dark:text-primary-400">{stat.value}</span>
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {t(stat.labelKey, stat.labelDefault)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-16">
          <div className="relative flex items-center justify-between overflow-x-auto py-8">
            {/* Line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary-200 dark:bg-primary-800" />
            {TIMELINE.map((event, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center px-4">
                <div className="mb-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 ring-4 ring-primary-100 dark:ring-primary-900/50" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">{event.year}</span>
                <span className="mt-1 max-w-[120px] text-center text-xs text-slate-500 dark:text-slate-400">
                  {t(event.labelKey, event.labelDefault)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Our Values */}
        <section className="mb-16">
          <h2 className="mb-10 text-center text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {t('pages.about.valuesTitle', 'Our Values')}
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {VALUES.map(({ icon: Icon, titleKey, titleDefault }, idx) => (
              <div
                key={idx}
                className="premium-card flex flex-col items-center"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t(titleKey, titleDefault)}
                </h3>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-slate-600 dark:text-slate-400">
            {t('pages.about.ctaText', 'Have questions? Get in touch.')}
          </p>
          <Link
            to="/contact"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-700"
          >
            {t('common.contact')}
          </Link>
        </div>
      </div>
    </>
  );
}
