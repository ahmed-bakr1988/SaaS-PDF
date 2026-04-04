import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Search } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import BreadcrumbNav from '@/components/seo/BreadcrumbNav';
import ManifestToolIcon from '@/components/shared/ManifestToolIcon';
import { TOOLS_SEO } from '@/config/seoData';
import { TOOL_MANIFEST } from '@/config/toolManifest';
import { generateBreadcrumbs, generateCollectionPage, generateItemList, getSiteOrigin } from '@/utils/seo';

const CATEGORY_TABS = [
  { key: 'All', labelKey: 'pages.toolsHub.categoryAll', labelDefault: 'All' },
  { key: 'Convert', labelKey: 'pages.toolsHub.categoryConvert', labelDefault: 'Convert' },
  { key: 'PDF', labelKey: 'pages.toolsHub.categoryOrganize', labelDefault: 'Organize' },
  { key: 'Image', labelKey: 'pages.toolsHub.categoryOptimize', labelDefault: 'Optimize' },
  { key: 'AI', labelKey: 'pages.toolsHub.categorySecurity', labelDefault: 'Security' },
] as const;

function getManifestEntry(slug: string) {
  return TOOL_MANIFEST.find((t) => t.slug === slug);
}

export default function AllToolsPage() {
  const { t } = useTranslation();
  const origin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const path = '/tools';
  const url = `${origin}${path}`;
  const [activeTab, setActiveTab] = useState('All');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredTools = useMemo(() => {
    let tools = TOOLS_SEO;
    if (activeTab !== 'All') {
      tools = tools.filter((tool) => tool.category === activeTab);
    }
    if (deferredQuery) {
      tools = tools.filter((tool) => {
        const title = t(`tools.${tool.i18nKey}.title`).toLowerCase();
        const desc = t(`tools.${tool.i18nKey}.shortDesc`, '').toLowerCase();
        return title.includes(deferredQuery) || desc.includes(deferredQuery);
      });
    }
    return tools;
  }, [activeTab, deferredQuery, t]);

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
      TOOLS_SEO.map((tool) => ({
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

      <div className="mx-auto max-w-6xl space-y-8">
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
            {t('pages.toolsHub.title', 'All PDF Tools')}
          </h1>
        </section>

        {/* Search + category tabs */}
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
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-primary-600'
                }`}
              >
                {t(tab.labelKey, tab.labelDefault)}
              </button>
            ))}
          </div>
        </div>

        {/* Tools grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTools.map((tool) => {
            const manifest = getManifestEntry(tool.slug);
            return (
              <Link
                key={tool.slug}
                to={`/tools/${tool.slug}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-600"
              >
                <div className="mb-4 flex items-center gap-3">
                  {manifest ? (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${manifest.bgColor}`}>
                      <ManifestToolIcon iconName={manifest.iconName} className={`h-5 w-5 ${manifest.iconColor}`} />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700" />
                  )}
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {t(`tools.${tool.i18nKey}.title`)}
                  </h3>
                </div>
                <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {t(`tools.${tool.i18nKey}.shortDesc`)}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-primary-400">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>

        {filteredTools.length === 0 && (
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
