import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
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

      {/* Hero Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 px-4 mb-10 rounded-b-[3rem]">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white mb-6">
            {t('home.hero')}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
            {t('home.heroSub')}
          </p>

          {/* Smart Upload Zone */}
          <HeroUploadZone />
        </div>
      </section>

      {/* Ad Slot */}
      <AdSlot slot="home-top" format="horizontal" className="mb-8" />

      <SocialProofStrip className="mb-10" />

      <section className="mb-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t('common.search')}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
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

      <section className="mb-12 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
              {t('common.developers')}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {t('pages.developers.ctaTitle')}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {t('pages.developers.ctaSubtitle')}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/developers"
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              {t('pages.developers.openDocs')}
            </a>
            <a
              href="/account"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('pages.developers.getApiKey')}
            </a>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section>
        <h2 className="mb-6 text-center text-xl font-semibold text-slate-800 dark:text-slate-200">
          {t('home.pdfTools')}
        </h2>
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

        <h2 className="mb-6 text-center text-xl font-semibold text-slate-800 dark:text-slate-200">
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

      {/* Features / Why Choose Us */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900 rounded-3xl mb-12 px-6 sm:px-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-10">
          {t('home.featuresTitle', 'A smarter way to convert and edit online')}
        </h2>
        <div className="grid gap-8 sm:grid-cols-3 text-center">
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 mb-6">
              <Layers className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {t('home.feature1Title', 'One complete workspace')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {t('home.feature1Desc', 'Edit, convert, compress, merge, split without switching tabs.')}
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 mb-6">
              <span className="text-2xl font-bold inline-block">100%</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {t('home.feature2Title', 'Accuracy you can trust')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {t('home.feature2Desc', 'Get pixel-perfect, editable files in seconds with zero quality loss.')}
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 mb-6">
              <Lock className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {t('home.feature3Title', 'Built-in security')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {t('home.feature3Desc', 'Access files securely, protected by automatic encryption.')}
            </p>
          </div>
        </div>
      </section>

      {/* Ad Slot - Bottom */}
      <AdSlot slot="home-bottom" className="mt-12" />
    </>
  );
}
