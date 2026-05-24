import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Crown,
  Download,
  Globe,
  GraduationCap,
  Layers,
  Lock,
  MousePointerClick,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
  Users,
  X,
  Zap,
} from 'lucide-react';
import MarketingPageLayout from '@/components/layout/MarketingPageLayout';
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
  creditHint?: string;
  speedTier?: 'instant' | 'fast' | 'moderate';
  group?: string;
}

function manifestToToolInfo(tools: readonly ToolEntry[]): ToolInfo[] {
  return tools.map((t) => ({
    key: t.i18nKey,
    path: `/tools/${t.slug}`,
    icon: <ManifestToolIcon iconName={t.iconName} className={`h-6 w-6 ${t.iconColor}`} />,
    bgColor: t.bgColor,
    iconName: t.iconName,
    iconColor: t.iconColor,
    creditHint: t.creditHint,
    speedTier: t.speedTier,
    group: t.group,
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
      bodyClassName="pb-24 md:pb-12"
      hero={
        <section className="relative overflow-hidden px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pt-16">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center xl:gap-12">
              <div className="relative z-10 text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-700 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                  {t('home.heroBadge', 'Modern document workflows')}
                </span>

                <h1 className="mt-8 text-4xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-6xl lg:text-7xl leading-tight lg:leading-[1.15]">
                  {t('home.hero')}
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 lg:mx-0 mx-auto">
                  {t('home.heroSub')}
                </p>

                <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {[
                    { icon: ShieldCheck, text: t('home.trustSecure', 'Files auto-deleted'), color: 'text-emerald-600 dark:text-emerald-400' },
                    { icon: Zap, text: t('home.trustFast', 'Results in seconds'), color: 'text-amber-500 dark:text-amber-400' },
                    { icon: Globe, text: t('home.trust30Tools', '30+ free tools'), color: 'text-brand-600 dark:text-brand-400' },
                    { icon: Lock, text: t('home.trustNoSignup', 'No sign-up needed'), color: 'text-violet-600 dark:text-violet-400' },
                  ].map(({ icon: Icon, text, color }) => (
                    <div key={text} className="flex flex-col items-center gap-2 rounded-2xl bg-white/50 p-4 ring-1 ring-zinc-100 dark:bg-zinc-900/30 dark:ring-zinc-800 lg:items-start">
                      <Icon className={`h-5 w-5 ${color}`} />
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mt-8 lg:mt-0">
                <div className="pointer-events-none absolute -inset-4 rounded-[3rem] bg-gradient-to-tr from-brand-500/10 via-transparent to-amber-500/10 blur-2xl dark:from-brand-500/5 dark:to-amber-500/5" />
                <HeroUploadZone />
              </div>
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

      {/* ── USE CASES ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <SectionIntro
          align="center"
          eyebrow={t('home.useCasesLabel', 'Who it\'s for')}
          title={t('home.useCasesTitle', 'Built for the way you actually work')}
          description={t('home.useCasesSubtitle', 'Whether you\'re a student, freelancer, or enterprise team — Dociva adapts to your workflow.')}
          className="mb-10"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              icon: GraduationCap,
              titleKey: 'home.useCaseStudent',
              titleDefault: 'Students',
              descKey: 'home.useCaseStudentDesc',
              descDefault: 'Convert lecture slides, OCR handwritten notes, summarize research papers.',
              color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            },
            {
              icon: Users,
              titleKey: 'home.useCaseHR',
              titleDefault: 'HR Teams',
              descKey: 'home.useCaseHRDesc',
              descDefault: 'Batch convert resumes, protect contracts, organize employee docs.',
              color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            },
            {
              icon: Briefcase,
              titleKey: 'home.useCaseFreelancer',
              titleDefault: 'Freelancers',
              descKey: 'home.useCaseFreelancerDesc',
              descDefault: 'Create proposals, sign contracts, watermark deliverables.',
              color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
            },
            {
              icon: Layers,
              titleKey: 'home.useCaseBusiness',
              titleDefault: 'Businesses',
              descKey: 'home.useCaseBusinessDesc',
              descDefault: 'API integrations, bulk processing, priority queues for your team.',
              color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
            },
            {
              icon: Scale,
              titleKey: 'home.useCaseLegal',
              titleDefault: 'Legal Teams',
              descKey: 'home.useCaseLegalDesc',
              descDefault: 'Redact PDFs, flatten forms, extract tables from contracts.',
              color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
            },
          ].map(({ icon: Icon, titleKey, titleDefault, descKey, descDefault, color }) => (
            <div key={titleKey} className="marketing-card text-center">
              <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t(titleKey, titleDefault)}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {t(descKey, descDefault)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="premium-surface p-8 sm:p-12 lg:p-16">
          <div className="grid gap-12 xl:grid-cols-[300px_1fr]">
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
              <div className="mb-10 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{t('home.pdfTools')}</h2>
                <Link to="/tools" className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
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
                    creditHint={tool.creditHint}
                    speedTier={tool.speedTier}
                    group={tool.group}
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
                      creditHint={tool.creditHint}
                      speedTier={tool.speedTier}
                      group={tool.group}
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
              <div key={panel.titleKey} className="premium-card flex h-full flex-col">
                <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm ${panel.bgClassName}`}>
                  <Icon className={`h-8 w-8 ${panel.iconClassName}`} />
                </div>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
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

      {/* ── WHY UPGRADE ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <SectionIntro
          align="center"
          eyebrow={t('home.whyUpgradeLabel', 'Free vs Pro')}
          title={t('home.whyUpgradeTitle', 'Do more with a plan that fits')}
          description={t('home.whyUpgradeSubtitle', 'Start free. Upgrade when you need faster processing, larger files, and AI-powered features.')}
          className="mb-10"
        />
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Free tier */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                <Zap className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('home.freeTierTitle', 'Free')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('home.freeTierDesc', 'Great for occasional use')}</p>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                t('home.freePerk1', '5 daily operations'),
                t('home.freePerk2', '20 MB file limit'),
                t('home.freePerk3', 'All Quick Tools'),
                t('home.freePerk4', 'Standard processing queue'),
              ].map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro tier */}
          <div className="relative rounded-3xl border-2 border-violet-400 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-8 shadow-lg shadow-violet-100 dark:border-violet-600 dark:from-violet-950/30 dark:via-slate-800 dark:to-purple-950/20 dark:shadow-violet-900/20">
            <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 px-3 py-1 text-xs font-bold text-white shadow-md">
              <Crown className="h-3 w-3" />
              {t('home.proLabel', 'Most Popular')}
            </span>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('home.proTierTitle', 'Pro')}</h3>
                <p className="text-sm text-violet-600 dark:text-violet-400">{t('home.proTierDesc', 'For power users and teams')}</p>
              </div>
            </div>
            <ul className="space-y-3">
              {[
                t('home.proPerk1', 'Unlimited operations'),
                t('home.proPerk2', 'Up to 1 GB uploads'),
                t('home.proPerk3', 'AI Workspace (Chat, Summarize, Translate)'),
                t('home.proPerk4', 'Priority processing queue'),
                t('home.proPerk5', 'Batch processing (20 files)'),
                t('home.proPerk6', 'Workspace history & analytics'),
              ].map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                  <Star className="h-4 w-4 shrink-0 text-amber-400" />
                  {perk}
                </li>
              ))}
            </ul>
            <Link
              to="/pricing"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:shadow-violet-900/40"
            >
              {t('home.viewPlans', 'View Plans')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
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
                className="inline-flex items-center gap-3 rounded-full bg-white px-10 py-4 text-sm font-black text-primary-700 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
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

      </section>
    </MarketingPageLayout>
  );
}
