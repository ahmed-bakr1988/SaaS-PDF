import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Search, Zap, Sparkles, Briefcase, Code2 } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import BreadcrumbNav from '@/components/seo/BreadcrumbNav';
import ManifestToolIcon from '@/components/shared/ManifestToolIcon';
import { TOOL_MANIFEST, getToolsByGroup, type ToolGroup, type ToolEntry } from '@/config/toolManifest';
import { generateBreadcrumbs, generateCollectionPage, generateItemList, getSiteOrigin } from '@/utils/seo';

const TOOL_GROUPS: {
  key: ToolGroup;
  icon: typeof Zap;
  titleKey: string;
  titleDefault: string;
  descKey: string;
  descDefault: string;
  premium?: boolean;
}[] = [
  {
    key: 'quick-tools',
    icon: Zap,
    titleKey: 'pages.toolsHub.groupQuickTools',
    titleDefault: 'Quick Tools',
    descKey: 'pages.toolsHub.groupQuickToolsDesc',
    descDefault: 'Fast, lightweight PDF operations — merge, split, compress, rotate, and more.',
  },
  {
    key: 'ai-workspace',
    icon: Sparkles,
    titleKey: 'pages.toolsHub.groupAiWorkspace',
    titleDefault: 'AI Workspace',
    descKey: 'pages.toolsHub.groupAiWorkspaceDesc',
    descDefault: 'Intelligent document analysis powered by AI — chat, summarize, translate, and extract.',
    premium: true,
  },
  {
    key: 'productivity',
    icon: Briefcase,
    titleKey: 'pages.toolsHub.groupProductivity',
    titleDefault: 'Productivity Suite',
    descKey: 'pages.toolsHub.groupProductivityDesc',
    descDefault: 'Convert, edit, and transform documents across formats — PDF, Word, Excel, images, and more.',
  },
  {
    key: 'developer',
    icon: Code2,
    titleKey: 'pages.toolsHub.groupDeveloper',
    titleDefault: 'Developer & Utilities',
    descKey: 'pages.toolsHub.groupDeveloperDesc',
    descDefault: 'QR codes, barcodes, word counters, and other developer-friendly utilities.',
  },
];

const SPEED_LABELS: Record<string, { icon: string; label: string }> = {
  instant: { icon: '⚡', label: 'Instant' },
  fast: { icon: '🚀', label: 'Fast' },
  moderate: { icon: '⏱️', label: 'Moderate' },
};

export default function AllToolsPage() {
  const { t } = useTranslation();
  const origin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const path = '/tools';
  const url = `${origin}${path}`;
  const [activeGroup, setActiveGroup] = useState<ToolGroup | 'all'>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filterTool = (tool: ToolEntry) => {
    if (!deferredQuery) return true;
    const title = t(`tools.${tool.i18nKey}.title`).toLowerCase();
    const desc = t(`tools.${tool.i18nKey}.shortDesc`, '').toLowerCase();
    return title.includes(deferredQuery) || desc.includes(deferredQuery);
  };

  const groupedTools = useMemo(() => {
    return TOOL_GROUPS.map((group) => ({
      ...group,
      tools: getToolsByGroup(group.key).filter(filterTool),
    }));
  }, [activeGroup, deferredQuery, t]);

  const visibleGroups = activeGroup === 'all'
    ? groupedTools
    : groupedTools.filter((g) => g.key === activeGroup);

  const totalVisible = visibleGroups.reduce((sum, g) => sum + g.tools.length, 0);

  const jsonLd = [
    generateCollectionPage({
      name: t('pages.toolsHub.metaTitle'),
      description: t('pages.toolsHub.metaDescription'),
      url,
    }),
    generateBreadcrumbs([
      { name: t('common.home'), url: origin },
      { name: t('common.allTools'), url },
    ]),
    generateItemList(
      TOOL_MANIFEST.map((tool) => ({
        name: t(`tools.${tool.i18nKey}.title`),
        url: `${origin}/tools/${tool.slug}`,
      })),
    ),
  ];

  return (
    <>
      <SEOHead
        title={t('pages.toolsHub.metaTitle')}
        description={t('pages.toolsHub.metaDescription')}
        path={path}
        jsonLd={jsonLd}
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <section>
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: t('common.home'), to: '/' },
              { label: t('common.allTools') },
            ]}
          />

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            {t('pages.toolsHub.title', 'All Tools')}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            {t('pages.toolsHub.subtitle', 'Find the right tool for your workflow — organized by purpose.')}
          </p>
        </section>

        {/* Search + group tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('pages.toolsHub.searchPlaceholder', 'Search tools...')}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-slate-700 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveGroup('all')}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                activeGroup === 'all'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-600'
              }`}
            >
              {t('pages.toolsHub.categoryAll', 'All')}
            </button>
            {TOOL_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setActiveGroup(group.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                    activeGroup === group.key
                      ? group.premium
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
                        : 'bg-primary-600 text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(group.titleKey, group.titleDefault)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tool groups */}
        {visibleGroups.map((group) => {
          if (group.tools.length === 0) return null;
          const Icon = group.icon;
          return (
            <section key={group.key} className="space-y-6">
              {/* Group header */}
              <div className={`flex items-center gap-4 rounded-2xl p-6 ${
                group.premium
                  ? 'bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 ring-1 ring-violet-200 dark:from-violet-950/40 dark:via-purple-950/40 dark:to-fuchsia-950/40 dark:ring-violet-800'
                  : 'bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-800/50 dark:ring-slate-700'
              }`}>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  group.premium
                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/40'
                    : 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t(group.titleKey, group.titleDefault)}
                    {group.premium && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-gradient-to-r from-violet-500 to-purple-500 px-2.5 py-0.5 text-xs font-bold text-white">
                        AI
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t(group.descKey, group.descDefault)}
                  </p>
                </div>
              </div>

              {/* Tool cards grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.tools.map((tool) => (
                  <Link
                    key={tool.slug}
                    to={`/tools/${tool.slug}`}
                    className={`group flex flex-col rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      group.premium
                        ? 'border-violet-200 bg-white hover:border-violet-400 hover:shadow-violet-100 dark:border-violet-800 dark:bg-slate-800/80 dark:hover:border-violet-600 dark:hover:shadow-violet-900/20'
                        : 'border-slate-200 bg-white hover:border-primary-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-600'
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.bgColor}`}>
                        <ManifestToolIcon iconName={tool.iconName} className={`h-5 w-5 ${tool.iconColor}`} />
                      </div>
                      <h3 className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {t(`tools.${tool.i18nKey}.title`)}
                      </h3>
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
                      {t(`tools.${tool.i18nKey}.shortDesc`)}
                    </p>
                    {/* Credit cost + speed tier badges */}
                    <div className="mt-3 flex items-center gap-2">
                      {tool.creditHint && tool.creditHint !== '0' && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800">
                          {tool.creditHint} {t('common.credits', 'credits')}
                        </span>
                      )}
                      {tool.creditHint === '0' && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800">
                          {t('common.free', 'Free')}
                        </span>
                      )}
                      {tool.speedTier && SPEED_LABELS[tool.speedTier] && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          {SPEED_LABELS[tool.speedTier].icon} {SPEED_LABELS[tool.speedTier].label}
                        </span>
                      )}
                      <ArrowRight className="ml-auto h-4 w-4 text-primary-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-primary-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        {totalVisible === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-800">
            <p className="text-slate-500 dark:text-slate-400">
              {t('pages.toolsHub.noResults', 'No tools found matching your search.')}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
