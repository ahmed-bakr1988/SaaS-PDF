import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage, getSiteOrigin } from '@/utils/seo';
import { BookOpen, Calendar, ArrowRight, Search, X } from 'lucide-react';
import {
  BLOG_ARTICLES,
  getLocalizedBlogArticle,
  normalizeBlogLocale,
} from '@/content/blogArticles';

export default function BlogPage() {
  const { t, i18n } = useTranslation();
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const locale = normalizeBlogLocale(i18n.language);

  const posts = BLOG_ARTICLES.map((article) => getLocalizedBlogArticle(article, locale));

  const filteredPosts = !deferredQuery
    ? posts
    : posts.filter((post) => {
        const haystack = `${post.title} ${post.excerpt} ${post.category}`.toLowerCase();
        return haystack.includes(deferredQuery);
      });

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
        title={t('pages.blog.metaTitle')}
        description={t('pages.blog.metaDescription')}
        path="/blog"
        jsonLd={generateWebPage({
          name: t('pages.blog.metaTitle'),
          description: t('pages.blog.metaDescription'),
          url: `${siteOrigin}/blog`,
        })}
      />

      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <BookOpen className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {t('pages.blog.title')}
            </h1>
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            {t('pages.blog.subtitle')}
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder={t('pages.blog.searchPlaceholder')}
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

        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <article
              key={post.slug}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {post.category}
                </span>
                <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                    {post.publishedAt}
                </span>
              </div>

              <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
                {post.title}
              </h2>
              <p className="mb-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                {post.excerpt}
              </p>

              <Link
                to={`/blog/${post.slug}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {t('pages.blog.readMore')} <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-600 dark:bg-slate-800/50">
            <p className="text-base font-medium text-slate-700 dark:text-slate-200">
              {t('pages.blog.noResults')}
            </p>
          </div>
        )}

        {/* Coming Soon */}
        <div className="mt-10 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-600 dark:bg-slate-800/50">
          <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
            {t('pages.blog.comingSoon')}
          </p>
        </div>
      </div>
    </>
  );
}
