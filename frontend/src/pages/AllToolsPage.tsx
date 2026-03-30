import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEOHead from '@/components/seo/SEOHead';
import BreadcrumbNav from '@/components/seo/BreadcrumbNav';
import { TOOLS_SEO } from '@/config/seoData';
import { generateBreadcrumbs, generateCollectionPage, generateItemList, getSiteOrigin } from '@/utils/seo';

const CATEGORY_ORDER = ['PDF', 'Convert', 'Image', 'AI', 'Utility'] as const;

export default function AllToolsPage() {
  const { t } = useTranslation();
  const origin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const path = '/tools';
  const url = `${origin}${path}`;

  const groupedTools = CATEGORY_ORDER.map((category) => ({
    category,
    items: TOOLS_SEO.filter((tool) => tool.category === category),
  })).filter((group) => group.items.length > 0);

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

      <div className="mx-auto max-w-6xl space-y-10">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-10">
          <BreadcrumbNav
            className="mb-6"
            items={[
              { label: t('common.home'), to: '/' },
              { label: t('common.allTools') },
            ]}
          />

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {t('pages.toolsHub.title')}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            {t('pages.toolsHub.description')}
          </p>
        </section>

        {groupedTools.map((group) => (
          <section
            key={group.category}
            className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
          >
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {t(`pages.toolsHub.categories.${group.category}`)}
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((tool) => (
                <Link
                  key={tool.slug}
                  to={`/tools/${tool.slug}`}
                  className="rounded-2xl border border-slate-200 p-5 transition-colors hover:border-primary-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-primary-600 dark:hover:bg-slate-800"
                >
                  <p className="text-sm font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
                    {group.category}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    {t(`tools.${tool.i18nKey}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {t(`tools.${tool.i18nKey}.shortDesc`)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
