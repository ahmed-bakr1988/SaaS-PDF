import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { generateOrganization, generateWebSite, getSiteOrigin } from '@/utils/seo';
import {
  FileText,
  FileOutput,
  Minimize2,
  ImageIcon,
  Film,
  Hash,
  Eraser,
  Layers,
  Scissors,
  RotateCw,
  Image,
  FileImage,
  Droplets,
  Lock,
  Unlock,
  ListOrdered,
  PenLine,
  GitBranch,
  Scaling,
  ScanText,
  Sheet,
  ArrowUpDown,
  QrCode,
  Code,
  MessageSquare,
  Languages,
  Table,
  Search,
  X,
  Crop,
  FileDown,
  Wrench,
  Presentation,
  Barcode,
  ShieldCheck,
  Zap,
  Globe,
  UploadCloud,
  MousePointerClick,
  Download,
  ArrowRight,
  Star,
  CheckCircle2,
} from 'lucide-react';
import ToolCard from '@/components/shared/ToolCard';
import HeroUploadZone from '@/components/shared/HeroUploadZone';
import AdSlot from '@/components/layout/AdSlot';
import SocialProofStrip from '@/components/shared/SocialProofStrip';
import { getHomepageTools, type ToolEntry } from '@/config/toolManifest';

// Map icon names from manifest to lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, FileOutput, Minimize2, ImageIcon, Film, Hash, Eraser, Layers,
  Scissors, RotateCw, Image, FileImage, Droplets, Lock, Unlock, ListOrdered,
  PenLine, GitBranch, Scaling, ScanText, Sheet, ArrowUpDown, QrCode, Code,
  MessageSquare, Languages, Table, Crop, FileDown, Wrench, Presentation, Barcode,
};

function renderToolIcon(tool: ToolEntry) {
  const IconComponent = ICON_MAP[tool.iconName];
  if (!IconComponent) return null;
  return <IconComponent className={`h-6 w-6 ${tool.iconColor}`} />;
}

interface ToolInfo {
  key: string;
  path: string;
  icon: React.ReactNode;
  bgColor: string;
}

function manifestToToolInfo(tools: readonly ToolEntry[]): ToolInfo[] {
  return tools.map((t) => ({
    key: t.i18nKey,
    path: `/tools/${t.slug}`,
    icon: renderToolIcon(t),
    bgColor: t.bgColor,
  }));
}

const pdfTools: ToolInfo[] = manifestToToolInfo(getHomepageTools('pdf'));
const otherTools: ToolInfo[] = manifestToToolInfo(getHomepageTools('other'));

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
    <>
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

      {/* ── Hero Section ──────────────────────────────────────────── */}
      <section className="hero-gradient-bg relative overflow-hidden py-16 sm:py-24 px-4 mb-10 rounded-b-[3rem]">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary-400/10 blur-3xl dark:bg-primary-600/10" />
        <div className="pointer-events-none absolute top-0 right-0 h-80 w-80 rounded-full bg-accent-400/8 blur-3xl dark:bg-accent-600/8" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 mb-6 dark:border-primary-800 dark:bg-primary-900/30">
            <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-300">
              {t('home.heroBadge', 'Free Online PDF & File Tools')}
            </span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-white mb-6 leading-[1.1]">
            {t('home.hero')}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            {t('home.heroSub')}
          </p>

          {/* Trust strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10">
            {[
              { icon: ShieldCheck, text: t('home.trustNoSignup', 'No sign-up needed') },
              { icon: Zap,         text: t('home.trustFast',     'Results in seconds') },
              { icon: Lock,        text: t('home.trustSecure',   'Files auto-deleted') },
              { icon: Globe,       text: t('home.trust30Tools',  '30+ free tools') },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <Icon className="h-4 w-4 text-primary-500 flex-shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Smart Upload Zone */}
          <HeroUploadZone />
        </div>
      </section>

      {/* ── Ad Slot ───────────────────────────────────────────────── */}
      <AdSlot slot="home-top" format="horizontal" className="mb-8" />

      {/* ── Social Proof Strip ────────────────────────────────────── */}
      <SocialProofStrip className="mb-10" />

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section className="mb-14 px-2">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
            {t('home.howItWorksLabel', 'Simple process')}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('home.howItWorksTitle', 'Convert & edit in 3 steps')}
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            {t('home.howItWorksSubtitle', 'No account, no installation, no waiting. Just upload, choose a tool, and download.')}
          </p>
        </div>

        <div className="relative grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map(({ step, icon: Icon, titleKey, titleDefault, descKey, descDefault, color, glow }, idx) => (
            <div key={step} className="relative">
              {/* Connector line (between steps, hidden on mobile) */}
              {idx < HOW_IT_WORKS.length - 1 && (
                <div className="step-connector" />
              )}
              <div className="flex flex-col items-center text-center rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800/70 dark:ring-slate-700/60">
                {/* Numbered icon */}
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

      {/* ── Search & Tools ────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t('common.search')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('home.searchToolsPlaceholder')}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-2xl">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder={t('home.searchToolsPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors focus:border-primary-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-primary-500"
              />
            </label>
            {query && (
              <button
                type="button"
                onClick={() => updateQuery('')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                {t('common.clear')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── PDF Tools Grid ────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {t('home.pdfTools')}
          </h2>
          <Link to="/tools" className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
            {t('common.allTools')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-10">
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

        <h2 className="mb-6 text-xl font-bold text-slate-800 dark:text-slate-200">
          {t('home.otherTools', 'Other Tools')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-12">
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

        {filteredPdfTools.length + filteredOtherTools.length === 0 && (
          <div className="mb-12 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-600 dark:bg-slate-800/50">
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">
              {t('home.noSearchResults')}
            </p>
          </div>
        )}
      </section>

      {/* ── Features / Why Choose Us ──────────────────────────────── */}
      <section className="mb-14 overflow-hidden rounded-3xl bg-slate-50 px-6 py-16 dark:bg-slate-900 sm:px-12">
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
            {t('home.whyChooseLabel', 'Why Dociva')}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('home.featuresTitle', 'A smarter way to work with files')}
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              icon: Layers,
              bg: 'bg-blue-100 dark:bg-blue-900/30',
              color: 'text-blue-600 dark:text-blue-400',
              titleKey: 'home.feature1Title',
              titleDefault: 'One complete workspace',
              descKey: 'home.feature1Desc',
              descDefault: 'Edit, convert, compress, merge, split — without switching tabs.',
              perks: [
                t('home.feature1Perk1', '30+ tools in one place'),
                t('home.feature1Perk2', 'PDF, image & video support'),
              ],
            },
            {
              icon: CheckCircle2,
              bg: 'bg-emerald-100 dark:bg-emerald-900/30',
              color: 'text-emerald-600 dark:text-emerald-400',
              titleKey: 'home.feature2Title',
              titleDefault: 'Accuracy you can trust',
              descKey: 'home.feature2Desc',
              descDefault: 'Pixel-perfect, editable output in seconds with zero quality loss.',
              perks: [
                t('home.feature2Perk1', 'Preserve fonts & layouts'),
                t('home.feature2Perk2', 'Batch-tested quality'),
              ],
            },
            {
              icon: ShieldCheck,
              bg: 'bg-violet-100 dark:bg-violet-900/30',
              color: 'text-violet-600 dark:text-violet-400',
              titleKey: 'home.feature3Title',
              titleDefault: 'Built-in security',
              descKey: 'home.feature3Desc',
              descDefault: 'Files are automatically deleted after processing. No account required.',
              perks: [
                t('home.feature3Perk1', 'Auto-deletion after 1 hour'),
                t('home.feature3Perk2', 'Encrypted transfers'),
              ],
            },
          ].map(({ icon: Icon, bg, color, titleKey, titleDefault, descKey, descDefault, perks }) => (
            <div key={titleKey} className="flex flex-col rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
              <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${bg}`}>
                <Icon className={`h-7 w-7 ${color}`} />
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                {t(titleKey, titleDefault)}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {t(descKey, descDefault)}
              </p>
              <ul className="mt-auto space-y-2">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <Star className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Developer API Banner ──────────────────────────────────── */}
      <section className="mb-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
              {t('common.developers')}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {t('pages.developers.ctaTitle')}
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {t('pages.developers.ctaSubtitle')}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/developers"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-700 hover:-translate-y-px"
            >
              {t('pages.developers.openDocs')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/account"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('pages.developers.getApiKey')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA Banner ─────────────────────────────────────── */}
      <section className="relative mb-14 overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 px-8 py-16 text-center">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary-200">
            {t('home.ctaBannerLabel', 'Get started today')}
          </p>
          <h2 className="mb-4 text-3xl font-extrabold text-white sm:text-4xl">
            {t('home.ctaBannerTitle', 'Ready to convert your files?')}
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg text-primary-100">
            {t('home.ctaBannerSubtitle', 'Join thousands of users who convert, compress, and edit their files every day — completely free.')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/tools"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-primary-700 shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              {t('home.ctaBrowseTools', 'Browse All Tools')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/account"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/20 hover:-translate-y-0.5"
            >
              {t('home.ctaCreateAccount', 'Create Free Account')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Ad Slot - Bottom ──────────────────────────────────────── */}
      <AdSlot slot="home-bottom" className="mt-12" />
    </>
  );
}
