import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { generateWebPage } from '@/utils/seo';
import { BookOpen, Calendar, ArrowRight } from 'lucide-react';

interface BlogPost {
  slug: string;
  titleKey: string;
  excerptKey: string;
  date: string;
  category: string;
}

const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-compress-pdf-online',
    titleKey: 'pages.blog.posts.compressPdf.title',
    excerptKey: 'pages.blog.posts.compressPdf.excerpt',
    date: '2025-01-15',
    category: 'PDF',
  },
  {
    slug: 'convert-images-without-losing-quality',
    titleKey: 'pages.blog.posts.imageConvert.title',
    excerptKey: 'pages.blog.posts.imageConvert.excerpt',
    date: '2025-01-10',
    category: 'Image',
  },
  {
    slug: 'ocr-extract-text-from-images',
    titleKey: 'pages.blog.posts.ocrGuide.title',
    excerptKey: 'pages.blog.posts.ocrGuide.excerpt',
    date: '2025-01-05',
    category: 'AI',
  },
  {
    slug: 'merge-split-pdf-files',
    titleKey: 'pages.blog.posts.mergeSplit.title',
    excerptKey: 'pages.blog.posts.mergeSplit.excerpt',
    date: '2024-12-28',
    category: 'PDF',
  },
  {
    slug: 'ai-chat-with-pdf-documents',
    titleKey: 'pages.blog.posts.aiChat.title',
    excerptKey: 'pages.blog.posts.aiChat.excerpt',
    date: '2024-12-20',
    category: 'AI',
  },
];

export default function BlogPage() {
  const { t } = useTranslation();

  return (
    <>
      <SEOHead
        title={t('pages.blog.metaTitle')}
        description={t('pages.blog.metaDescription')}
        path="/blog"
        jsonLd={generateWebPage({
          name: t('pages.blog.metaTitle'),
          description: t('pages.blog.metaDescription'),
          url: `${window.location.origin}/blog`,
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

        <div className="space-y-6">
          {BLOG_POSTS.map((post) => (
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
                  {post.date}
                </span>
              </div>

              <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
                {t(post.titleKey)}
              </h2>
              <p className="mb-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                {t(post.excerptKey)}
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
