import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Globe,
  Layers,
  Lock,
  MousePointerClick,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';
import MarketingPageLayout from '@/components/layout/MarketingPageLayout';
import AdSlot from '@/components/layout/AdSlot';
import HeroUploadZone from '@/components/shared/HeroUploadZone';
import ManifestToolIcon from '@/components/shared/ManifestToolIcon';
import SectionIntro from '@/components/shared/SectionIntro';
import SocialProofStrip from '@/components/shared/SocialProofStrip';
import ToolCard from '@/components/shared/ToolCard';
import SEOHead from '@/components/seo/SEOHead';
import { TOOL_MANIFEST, getHomepageTools, type ToolEntry } from '@/config/toolManifest';
import { generateOrganization, generateWebSite, getSiteOrigin } from '@/utils/seo';

interface ToolInfo {
  key: string;
  path: string;
  icon: React.ReactNode;
  bgColor: string;
  iconName: string;
  iconColor: string;
}

function manifestToToolInfo(tools: readonly ToolEntry[]): ToolInfo[] {
  return tools.map((t) => ({
    key: t.i18nKey,
    path: `/tools/${t.slug}`,
    icon: <ManifestToolIcon iconName={t.iconName} className={`h-6 w-6 ${t.iconColor}`} />,
    bgColor: t.bgColor,
    iconName: t.iconName,
    iconColor: t.iconColor,
  }));
}

const pdfTools: ToolInfo[] = manifestToToolInfo(getHomepageTools('pdf'));
const otherTools: ToolInfo[] = manifestToToolInfo(getHomepageTools('other'));

const FEATURE_PANELS = [
  {
    icon: Layers,
    bgClassName: 'bg-blue-100 dark:bg-blue-900/30',
    iconClassName: 'text-blue-600 dark:text-blue-400',
    titleKey: 'home.feature1Title',
    titleDefault: 'One complete workspace',
    descKey: 'home.feature1Desc',
    descDefault: 'Edit, convert, compress, merge, and split without bouncing between disconnected tools.',
    perks: ['home.feature1Perk1', 'home.feature1Perk2'],
    fallbackPerks: ['30+ tools in one place', 'PDF, image, and AI workflows'],
  },
  {
    icon: CheckCircle2,
    bgClassName: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconClassName: 'text-emerald-600 dark:text-emerald-400',
    titleKey: 'home.feature2Title',
    titleDefault: 'Accuracy you can trust',
    descKey: 'home.feature2Desc',
    descDefault: 'Clear outputs, reliable formatting, and fast turnaround for the workflows people use every day.',
    perks: ['home.feature2Perk1', 'home.feature2Perk2'],
    fallbackPerks: ['Preserve layouts and readability', 'Built for repeatable file tasks'],
  },
  {
    icon: ShieldCheck,
    bgClassName: 'bg-violet-100 dark:bg-violet-900/30',
    iconClassName: 'text-violet-600 dark:text-violet-400',
    titleKey: 'home.feature3Title',
    titleDefault: 'Built-in security',
    descKey: 'home.feature3Desc',
    descDefault: 'Files are processed securely, automatically cleaned up, and accessible without forcing registration.',
    perks: ['home.feature3Perk1', 'home.feature3Perk2'],
    fallbackPerks: ['Auto-delete policies', 'Encrypted transfers'],
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: UploadCloud,
    titleKey: 'home.howStep1Title',
    titleDefault: 'Upload your file',
    descKey: 'home.howStep1Desc',
    descDefault: 'Drag & drop or click to select. PDF, Word, images and more — up to 200 MB.',
    color: 'bg-blue-600',
    glow: 'shadow-blue-200 dark:shadow-blue-900/40',
  },
  {
    step: '02',
    icon: MousePointerClick,
    titleKey: 'home.howStep2Title',
    titleDefault: 'Choose a tool',
    descKey: 'home.howStep2Desc',
    descDefault: 'We detect your file type and suggest the best tools automatically.',
    color: 'bg-violet-600',
    glow: 'shadow-violet-200 dark:shadow-violet-900/40',
  },
  {
    step: '03',
    icon: Download,
    titleKey: 'home.howStep3Title',
    titleDefault: 'Download instantly',
    descKey: 'home.howStep3Desc',
    descDefault: 'Your file is ready in seconds. No account needed — files are auto-deleted.',
    color: 'bg-emerald-600',
    glow: 'shadow-emerald-200 dark:shadow-emerald-900/40',
  },
];

export default function HomePage() {
  const { t } = useTranslation();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const homepageQuickLinks = pdfTools.slice(0, 4);
  const stats = [
    {
      label: t('home.statsToolsLabel', 'Total tools'),
      value: String(TOOL_MANIFEST.length),
    },
    {
      label: t('home.statsPdfLabel', 'PDF workflows'),
      value: String(pdfTools.length),
    },
    {
      label: t('home.statsOtherLabel', 'Image, AI & utility'),
      value: String(otherTools.length),
    },
    {
      label: t('home.statsAccessLabel', 'Access model'),
      value: t('home.statsAccessValue', 'No signup'),
    },
  ];

  const matchesTool = (tool: ToolInfo) => {
    if (!deferredQuery) {
      return true;
    }

    const haystack = `${t(`tools.${tool.key}.title`)} ${t(`tools.${tool.key}.shortDesc`)}`.toLowerCase();
    return haystack.includes(deferredQuery);
  };

  const filteredPdfTools = pdfTools.filter(matchesTool);
  const filteredOtherTools = otherTools.filter(matchesTool);

  const updateQuery = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <MarketingPageLayout
      bodyClassName="pb-20"
      hero={
        <section className="px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-10">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr] xl:gap-8">
            <div className="marketing-panel relative overflow-hidden p-8 sm:p-10 lg:p-12">
              <div className="pointer-events-none absolute -left-10 top-10 h-36 w-36 rounded-full bg-primary-200/60 blur-3xl dark:bg-primary-800/30" />
              <div className="pointer-events-none absolute bottom-0 right-0 h-44 w-44 rounded-full bg-sky-200/50 blur-3xl dark:bg-sky-800/20" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-primary-700 dark:border-primary-800 dark:bg-primary-900/25 dark:text-primary-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('home.heroBadge', 'Modern document workflows')}
                </span>

                <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl lg:leading-[1.02]">
                  {t('home.hero')}
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                  {t('home.heroSub')}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: ShieldCheck, text: t('home.trustSecure', 'Files auto-deleted') },
                    { icon: Zap, text: t('home.trustFast', 'Results in seconds') },
                    { icon: Globe, text: t('home.trust30Tools', '30+ free tools') },
                    { icon: Lock, text: t('home.trustNoSignup', 'No sign-up needed') },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="metric-card flex items-center gap-3 py-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                        <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{text}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to="/tools"
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-600 dark:bg-white dark:text-slate-950 dark:hover:bg-primary-300"
                  >
                    {t('home.ctaBrowseTools', 'Browse All Tools')}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {t('common.pricing')}
                  </Link>
                </div>

                <div className="mt-8 rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 dark:border-slate-700/70 dark:bg-slate-900/65">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {t('home.quickStartLabel', 'Popular starting points')}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {homepageQuickLinks.map((tool) => (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-primary-600 dark:hover:text-primary-300"
                      >
                        <ManifestToolIcon iconName={tool.iconName} className={`h-4 w-4 ${tool.iconColor}`} />
                        {t(`tools.${tool.key}.title`)}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="marketing-panel p-6 sm:p-8">
              <SectionIntro
                eyebrow={t('home.heroUploadEyebrow', 'Upload and start')}
                title={t('home.heroUploadTitle', 'Choose a file and jump straight into the right tool')}
                description={t(
                  'home.heroUploadDescription',
                  'The smart upload zone keeps the current routing logic and suggests the best workflow automatically.'
                )}
              />
              <HeroUploadZone />
            </div>
          </div>
        </section>
      }
    >
      <SEOHead
        title={t('common.appName')}
        description={t('home.heroSub')}
        path="/"
        jsonLd={[
          generateWebSite({
            origin: siteOrigin,
            description: t('home.heroSub'),
          }),
          generateOrganization(siteOrigin),
        ]}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdSlot slot="home-top" format="horizontal" className="mb-8" />
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <SocialProofStrip className="mb-12" />

        <SectionIntro
          align="center"
          eyebrow={t('home.howItWorksLabel', 'Simple process')}
          title={t('home.howItWorksTitle', 'Convert and edit in three simple steps')}
          description={t(
            'home.howItWorksSubtitle',
            'No account, no installation, and no friction. Upload, choose the right workflow, and download.'
          )}
          className="mb-10"
        />

        <div className="relative grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map(({ step, icon: Icon, titleKey, titleDefault, descKey, descDefault, color, glow }, idx) => (
            <div key={step} className="relative">
              {idx < HOW_IT_WORKS.length - 1 && (
                <div className="step-connector" />
              )}
              <div className="marketing-card flex flex-col items-center text-center p-7">
                <div className={`relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${color} shadow-lg ${glow} text-white`}>
                  <Icon className="h-8 w-8" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600">
                    {parseInt(step, 10)}
                  </span>
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-900 dark:text-white">
                  {t(titleKey, titleDefault)}
                </h3>
                <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {t(descKey, descDefault)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="marketing-panel p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 xl:grid-cols-[280px_1fr]">
            <div>
              <SectionIntro
                eyebrow={t('common.search')}
                title={t('home.toolsDirectoryTitle', 'Find the right tool faster')}
                description={t(
                  'home.toolsDirectorySubtitle',
                  'Search by task, format, or output and jump directly into the workflow you need.'
                )}
              />

              <label className="relative mt-6 block">
                <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder={t('home.searchToolsPlaceholder')}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-primary-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-primary-500"
                />
              </label>

              {query ? (
                <button
                  type="button"
                  onClick={() => updateQuery('')}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                  {t('common.clear')}
                </button>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {stats.map((stat) => (
                  <div key={stat.label} className="metric-card">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">{t('home.pdfTools')}</h2>
                <Link to="/tools" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                  {t('common.allTools')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredPdfTools.map((tool) => (
                  <ToolCard
                    key={tool.key}
                    to={tool.path}
                    icon={tool.icon}
                    title={t(`tools.${tool.key}.title`)}
                    description={t(`tools.${tool.key}.shortDesc`)}
                    bgColor={tool.bgColor}
                  />
                ))}
              </div>

              <div className="mt-10">
                <h2 className="mb-6 text-xl font-bold text-slate-950 dark:text-white">
                  {t('home.otherTools', 'Other Tools')}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredOtherTools.map((tool) => (
                    <ToolCard
                      key={tool.key}
                      to={tool.path}
                      icon={tool.icon}
                      title={t(`tools.${tool.key}.title`)}
                      description={t(`tools.${tool.key}.shortDesc`)}
                      bgColor={tool.bgColor}
                    />
                  ))}
                </div>
              </div>

              {filteredPdfTools.length + filteredOtherTools.length === 0 ? (
                <div className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                    {t('home.noSearchResults')}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <SectionIntro
          align="center"
          eyebrow={t('home.whyChooseLabel', 'Why Dociva')}
          title={t('home.featuresTitle', 'A clearer, faster way to work with files')}
          description={t(
            'home.featuresSubtitle',
            'The redesign is built around workflow clarity: one workspace, strong defaults, and fewer decisions before value.'
          )}
          className="mb-10"
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {FEATURE_PANELS.map((panel) => {
            const Icon = panel.icon;
            const perks = panel.perks.map((perkKey, index) => t(perkKey, panel.fallbackPerks[index]));

            return (
              <div key={panel.titleKey} className="marketing-card flex h-full flex-col p-7">
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${panel.bgClassName}`}>
                  <Icon className={`h-7 w-7 ${panel.iconClassName}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                  {t(panel.titleKey, panel.titleDefault)}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {t(panel.descKey, panel.descDefault)}
                </p>
                <ul className="mt-6 space-y-2">
                  {perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <Star className="h-4 w-4 shrink-0 text-amber-400" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="marketing-panel overflow-hidden bg-gradient-to-br from-slate-950 via-primary-900 to-sky-900 px-8 py-10 text-white dark:from-slate-900 dark:via-primary-950 dark:to-slate-900 sm:px-10 lg:px-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary-200">
                {t('common.developers')}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                {t('pages.developers.ctaTitle')}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-200">
                {t('pages.developers.ctaSubtitle')}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/developers"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-primary-100"
              >
                {t('pages.developers.openDocs')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/account"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                {t('pages.developers.getApiKey')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="marketing-panel relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 px-8 py-16 text-center text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary-200">
              {t('home.ctaBannerLabel', 'Get started today')}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {t('home.ctaBannerTitle', 'Ready to convert your files?')}
            </h2>
            <p className="mt-4 text-lg leading-8 text-primary-100">
              {t('home.ctaBannerSubtitle', 'Join thousands of users who convert, compress, and edit their files every day — completely free.')}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/tools"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-primary-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                {t('home.ctaBrowseTools', 'Browse All Tools')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/account"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/15"
              >
                {t('home.ctaCreateAccount', 'Create Free Account')}
              </Link>
            </div>
          </div>
        </div>

        <AdSlot slot="home-bottom" className="mt-12" />
      </section>
    </MarketingPageLayout>
  );
}
