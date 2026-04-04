import { Calendar, ChevronLeft, Clock } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdSlot from '@/components/layout/AdSlot';
import SEOHead from '@/components/seo/SEOHead';
import { getToolSEO } from '@/config/seoData';
import {
  BLOG_ARTICLES,
  getBlogArticleBySlug,
  getLocalizedBlogArticle,
  normalizeBlogLocale,
} from '@/content/blogArticles';
import { generateBlogPosting, generateBreadcrumbs, generateWebPage, getSiteOrigin } from '@/utils/seo';
import NotFoundPage from './NotFoundPage';

export default function BlogPostPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const locale = normalizeBlogLocale(i18n.language);
  const article = slug ? getBlogArticleBySlug(slug) : undefined;
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');

  if (!article) {
    return <NotFoundPage />;
  }

  const localizedArticle = getLocalizedBlogArticle(article, locale);
  const path = `/blog/${localizedArticle.slug}`;
  const url = `${siteOrigin}${path}`;

  const breadcrumbs = generateBreadcrumbs([
    { name: t('common.home'), url: siteOrigin },
    { name: t('common.blog'), url: `${siteOrigin}/blog` },
    { name: localizedArticle.title, url },
  ]);

  const relatedArticles = BLOG_ARTICLES
    .filter((candidate) => candidate.slug !== article.slug)
    .slice(0, 3)
    .map((candidate) => getLocalizedBlogArticle(candidate, locale));

  return (
    <>
      <SEOHead
        title={localizedArticle.title}
        description={localizedArticle.seoDescription}
        path={path}
        type="article"
        jsonLd={[
          generateWebPage({
            name: localizedArticle.title,
            description: localizedArticle.seoDescription,
            url,
          }),
          generateBlogPosting({
            headline: localizedArticle.title,
            description: localizedArticle.seoDescription,
            url,
            datePublished: localizedArticle.publishedAt,
            inLanguage: locale,
          }),
          breadcrumbs,
        ]}
      />

      <article className="mx-auto max-w-4xl">
        <Link
          to="/blog"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('pages.blog.backToBlog')}
        </Link>

        <header className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span className="rounded-full bg-primary-100 px-3 py-1 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              {localizedArticle.category}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {localizedArticle.publishedAt}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t('pages.blog.readTime', { count: localizedArticle.readingMinutes })}
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {localizedArticle.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-400">
            {localizedArticle.excerpt}
          </p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/60">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('pages.blog.keyTakeaways')}
              </h2>
              <ul className="mt-4 space-y-3">
                {localizedArticle.keyTakeaways.map((item) => (
                  <li key={item} className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                    • {item}
                  </li>
                ))}
              </ul>
            </section>

            {localizedArticle.sections.map((section) => (
              <section key={section.heading} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="leading-8 text-slate-700 dark:text-slate-300">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.bullets.length > 0 && (
                  <ul className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>• {bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('pages.blog.featuredTools')}
              </h2>
              <div className="mt-4 space-y-3">
                {localizedArticle.toolSlugs.map((toolSlug) => {
                  const tool = getToolSEO(toolSlug);
                  if (!tool) {
                    return null;
                  }
                  return (
                    <Link
                      key={toolSlug}
                      to={`/tools/${toolSlug}`}
                      className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-primary-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-primary-600 dark:hover:bg-slate-800"
                    >
                      <p className="font-medium text-slate-900 dark:text-white">
                        {t(`tools.${tool.i18nKey}.title`)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {t(`tools.${tool.i18nKey}.shortDesc`)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('common.blog')}
              </h2>
              <div className="mt-4 space-y-3">
                {relatedArticles.map((relatedArticle) => (
                  <Link
                    key={relatedArticle.slug}
                    to={`/blog/${relatedArticle.slug}`}
                    className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-primary-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-primary-600 dark:hover:bg-slate-800"
                  >
                    <p className="font-medium text-slate-900 dark:text-white">
                      {relatedArticle.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {relatedArticle.excerpt}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <AdSlot slot="bottom-banner" format="horizontal" className="mt-8" />
      </article>
    </>
  );
}