import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage, getSiteOrigin } from '@/utils/seo';
import {
  Lightbulb,
  Shield,
  Send,
  Users,
  Globe,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  ChevronRight,
  ArrowUpRight,
  Activity,
  HeartHandshake
} from 'lucide-react';
import { FILE_RETENTION_MINUTES } from '@/config/toolLimits';

export default function AboutPage() {
  const { t } = useTranslation();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');

  const stats = [
    {
      value: '1M+',
      label: t('pages.about.statsUsers', 'Users Served'),
      desc: t('pages.about.statsUsersDesc', 'Active professionals globally'),
      color: 'from-blue-500 to-sky-400',
      bgGlow: 'bg-blue-500/10'
    },
    {
      value: '500M+',
      label: t('pages.about.statsFiles', 'Files Processed'),
      desc: t('pages.about.statsFilesDesc', 'Converted, compressed & analyzed'),
      color: 'from-violet-500 to-purple-400',
      bgGlow: 'bg-violet-500/10'
    },
    {
      value: '150+',
      label: t('pages.about.statsCountries', 'Countries Reached'),
      desc: t('pages.about.statsCountriesDesc', 'Localizing tools across regions'),
      color: 'from-amber-500 to-orange-400',
      bgGlow: 'bg-amber-500/10'
    },
  ];

  const timeline = [
    {
      year: '2018',
      title: t('pages.about.timeline2018Title', 'The Vision'),
      desc: t('pages.about.timeline2018', 'Founded in London with a mission to clean up online file conversions.')
    },
    {
      year: '2020',
      title: t('pages.about.timeline2020Title', 'Cloud Engine'),
      desc: t('pages.about.timeline2020', 'Launched the cloud processing architecture to support larger PDF workflows.')
    },
    {
      year: '2022',
      title: t('pages.about.timeline2022Title', 'Arabic Pipelines'),
      desc: t('pages.about.timeline2022', 'Expanded servers globally and introduced advanced Arabic OCR pipelines.')
    },
    {
      year: '2024',
      title: t('pages.about.timeline2024Title', 'AI Intelligence'),
      desc: t('pages.about.timeline2024', 'Integrated multi-modal AI intelligence for summarization and translation.')
    }
  ];

  const values = [
    {
      icon: Lightbulb,
      title: t('pages.about.valueInnovation', 'Innovation'),
      desc: t('pages.about.valueInnovationDesc', 'Harnessing language models and custom sandboxes to solve document problems.'),
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/20'
    },
    {
      icon: Shield,
      title: t('pages.about.valueSecurity', 'Security'),
      desc: t('pages.about.valueSecurityDesc', 'Encrypted in transit, processed in isolation, and automatically deleted in minutes.'),
      color: 'text-violet-500 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-950/20'
    },
    {
      icon: Send,
      title: t('pages.about.valueSimplicity', 'Simplicity'),
      desc: t('pages.about.valueSimplicityDesc', 'Zero installations, clear defaults, and simple direct interfaces.'),
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20'
    }
  ];

  const team = [
    {
      initials: 'AR',
      name: t('pages.about.team.ceo', 'Alex River'),
      role: t('pages.about.team.ceoRole', 'CEO & Product Designer'),
      bio: t('pages.about.team.ceoBio', 'Product designer who envisioned a private document assistant for modern teams.'),
      gradient: 'from-blue-500 to-indigo-500'
    },
    {
      initials: 'SC',
      name: t('pages.about.team.cto', 'Sarah Chen'),
      role: t('pages.about.team.ctoRole', 'CTO & Core Infrastructure'),
      bio: t('pages.about.team.ctoBio', 'Cloud infrastructure expert specializing in secure task isolation and queue scaling.'),
      gradient: 'from-violet-500 to-purple-500'
    },
    {
      initials: 'MV',
      name: t('pages.about.team.lead', 'Marcus Vance'),
      role: t('pages.about.team.leadRole', 'Lead Frontend Engineer'),
      bio: t('pages.about.team.leadBio', 'Full-stack engineer focusing on responsive React systems and developer APIs.'),
      gradient: 'from-emerald-500 to-teal-500'
    }
  ];

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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-24">
        {/* ─── HERO SECTION ──────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 text-white shadow-2xl">
          {/* Decorative mesh background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.15),transparent_45%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.1),transparent_40%)]" />
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

          <div className="relative px-6 py-16 sm:px-12 sm:py-24 lg:px-16 lg:py-28 text-center max-w-4xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 px-4 py-1.5 text-xs font-bold text-violet-400">
              <Sparkles className="h-3.5 w-3.5" />
              {t('common.appName', 'Dociva')} · Platform Origin
            </span>

            <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl leading-[1.1] bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              {t('pages.about.heroTitle', 'Empowering Document Productivity Worldwide')}
            </h1>

            <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
              {t('pages.about.heroSubtitle', 'We build secure, modern, and intelligent file pipelines so you can manage documents without compromising your privacy or workflow speed.')}
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/tools"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/30 hover:brightness-110 transition-all"
              >
                Start Free Workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/developers"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Explore API Docs
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </section>

        {/* ─── ORIGIN STORY SECTION ────────────────────────────────── */}
        <section className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <span className="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Our Mission & Philosophy
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t('pages.about.storyTitle', 'The Dociva Origin Story')}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('pages.about.storyBody1')}
            </p>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('pages.about.storyBody2')}
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-violet-500/10 to-transparent blur-2xl dark:from-violet-500/5" />
            <div className="relative rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-6 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                {t('pages.about.privacyTitle', 'File Privacy Guarantee')}
              </h3>
              <div className="space-y-4">
                {[
                  t('pages.about.privacyText', { minutes: FILE_RETENTION_MINUTES }),
                  t('pages.about.technologyText'),
                  t('pages.about.securityText')
                ].map((text, idx) => (
                  <div key={idx} className="flex gap-3 items-start text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xs font-bold dark:bg-slate-800 dark:text-slate-400">
                      {idx + 1}
                    </span>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── PLATFORM SCALE & STATS SECTION ─────────────────────── */}
        <section className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Platform scale
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Trusted by users around the globe
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="group relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div className={`absolute right-6 top-6 h-12 w-12 rounded-2xl flex items-center justify-center ${stat.bgGlow} transition-transform duration-500 group-hover:scale-110`}>
                  <Globe className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <p className={`text-4xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
                <h4 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  {stat.label}
                </h4>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {stat.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CORE VALUES SECTION ────────────────────────────────── */}
        <section className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Product Principles
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t('pages.about.valuesTitle', 'Our Core Values')}
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {values.map(({ icon: Icon, title, desc, color, bg }, idx) => (
              <div
                key={idx}
                className="group relative rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-violet-800"
              >
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${bg} ${color} transition-transform duration-500 group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {title}
                </h3>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed dark:text-slate-400">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── TIMELINE ROADMAP SECTION ───────────────────────────── */}
        <section className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Our Journey
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              How Dociva Evolved
            </h2>
          </div>

          {/* Desktop Timeline Grid */}
          <div className="hidden lg:grid grid-cols-4 gap-6 relative">
            {/* Timeline connectors */}
            <div className="absolute left-4 right-4 top-[25px] h-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />

            {timeline.map((event, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700 ring-4 ring-white dark:bg-violet-900/40 dark:text-violet-300 dark:ring-slate-950">
                    {event.year}
                  </span>
                  <div className="h-0.5 flex-1 bg-transparent" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{event.title}</h4>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{event.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile & Tablet Timeline Stack */}
          <div className="lg:hidden space-y-8 pl-4 border-l border-slate-200 dark:border-slate-800">
            {timeline.map((event, idx) => (
              <div key={idx} className="relative pl-8">
                <span className="absolute -left-[25px] top-0 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700 ring-4 ring-slate-50 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-slate-950">
                  {event.year}
                </span>
                <div className="space-y-1 pt-2">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{event.title}</h4>
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{event.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── TEAM SECTION ───────────────────────────────────────── */}
        <section className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
              {t('pages.about.teamTitle', 'Our Team')}
            </span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {t('pages.about.teamSubtitle', 'Meet the minds behind the platform')}
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {team.map((member, idx) => (
              <div
                key={idx}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40"
              >
                {/* Visual Avatar replacement */}
                <div className="relative mb-6 h-20 w-20">
                  <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${member.gradient} text-white font-black text-2xl shadow-lg shadow-violet-200/50 dark:shadow-none`}>
                    {member.initials}
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-950 flex items-center justify-center">
                    <Activity className="h-3 w-3 text-white" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {member.name}
                </h3>
                <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mt-1">
                  {member.role}
                </p>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed dark:text-slate-400">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA BANNER SECTION ────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 p-8 sm:p-12 lg:p-16 text-center text-white shadow-xl shadow-violet-200/50 dark:shadow-none">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-[80px]" />

          <div className="relative max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-black sm:text-4xl">
              {t('pages.about.ctaTitle', 'Ready to work smarter and safer?')}
            </h2>
            <p className="text-base text-violet-100 leading-relaxed">
              {t('pages.about.ctaSubtitle', 'Join over a million users who process their files securely and instantly every single day.')}
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/tools"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-black text-violet-700 shadow-md hover:bg-slate-50 transition-colors"
              >
                Go to Workspace
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                {t('pages.about.ctaText', 'Have questions? Get in touch.')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
