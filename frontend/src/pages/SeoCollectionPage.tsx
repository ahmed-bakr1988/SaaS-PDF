import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, FolderKanban, Link2 } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import FAQSection from '@/components/seo/FAQSection';
import {
  getLocalizedText,
  getLocalizedTextList,
  getSeoCollectionPage,
  interpolateTemplate,
  normalizeSeoLocale,
} from '@/config/seoPages';
import { getToolSEO } from '@/config/seoData';
import { generateBreadcrumbs, generateFAQ, generateWebPage, getSiteOrigin } from '@/utils/seo';
import NotFoundPage from '@/pages/NotFoundPage';

interface SeoCollectionPageProps {
  slug: string;
}

const COPY = {
  en: {
    toolsHeading: 'Popular tools in this collection',
    selectionHeading: 'How to choose the right workflow',
    relatedHeading: 'Related landing pages',
    openTool: 'Open tool',
    chooseBullets: [
      'Pick a conversion workflow when the format itself needs to change.',
      'Pick a PDF workflow when you need to compress, merge, split, or secure a file.',
      'Use the shortest path first, then add OCR or cleanup only if the source file needs it.',
    ],
    breadcrumbLabel: 'Collections',
  },
  ar: {
    toolsHeading: 'أدوات شائعة داخل هذه المجموعة',
    selectionHeading: 'كيف تختار سير العمل المناسب',
    relatedHeading: 'صفحات هبوط ذات صلة',
    openTool: 'افتح الأداة',
    chooseBullets: [
      'اختر مسار تحويل عندما تحتاج إلى تغيير الصيغة نفسها.',
      'اختر مسار PDF عندما تحتاج إلى الضغط أو الدمج أو التقسيم أو الحماية.',
      'ابدأ بأقصر مسار مباشر، ثم أضف OCR أو التنظيف فقط إذا احتاج الملف المصدر إلى ذلك.',
    ],
    breadcrumbLabel: 'المجموعات',
  },
} as const;

export default function SeoCollectionPage({ slug }: SeoCollectionPageProps) {
  const { t, i18n } = useTranslation();
  const locale = normalizeSeoLocale(i18n.language);
  const copy = COPY[locale];
  const page = getSeoCollectionPage(slug);

  if (!page) {
    return <NotFoundPage />;
  }

  const focusKeyword = getLocalizedText(page.focusKeyword, locale);
  const tokens = {
    brand: 'Dociva',
    focusKeyword,
  };
  const title = interpolateTemplate(getLocalizedText(page.titleTemplate, locale), tokens);
  const description = interpolateTemplate(getLocalizedText(page.descriptionTemplate, locale), tokens);
  const intro = interpolateTemplate(getLocalizedText(page.introTemplate, locale), tokens);
  const keywords = [focusKeyword, ...getLocalizedTextList(page.supportingKeywords, locale)].join(', ');
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const faqItems = page.faqTemplates.map((item) => ({
    question: getLocalizedText(item.question, locale),
    answer: getLocalizedText(item.answer, locale),
  }));
  const relatedCollections = page.relatedCollectionSlugs
    .map((collectionSlug) => getSeoCollectionPage(collectionSlug))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const contentSections = page.contentSections ?? [];
  const path = locale === 'ar' ? `/ar/${page.slug}` : `/${page.slug}`;
  const url = `${siteOrigin}${path}`;
  const alternates = [
    { hrefLang: 'en', href: `${siteOrigin}/${page.slug}`, ogLocale: 'en_US' },
    { hrefLang: 'ar', href: `${siteOrigin}/ar/${page.slug}`, ogLocale: 'ar_SA' },
  ];

  const jsonLd = [
    generateWebPage({
      name: title,
      description,
      url,
    }),
    generateBreadcrumbs([
      { name: t('common.home'), url: siteOrigin },
      { name: copy.breadcrumbLabel, url: siteOrigin },
      { name: title, url },
    ]),
    generateFAQ(faqItems),
  ];

  return (
    <>
      <SEOHead title={title} description={description} path={path} keywords={keywords} jsonLd={jsonLd} alternates={alternates} />

      <div className="mx-auto max-w-6xl space-y-10">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-10">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              <FolderKanban className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
                {focusKeyword}
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {title}
              </h1>
            </div>
          </div>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            {description}
          </p>
          <p className="mt-4 max-w-4xl leading-8 text-slate-700 dark:text-slate-300">
            {intro}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {copy.toolsHeading}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {page.targetToolSlugs.map((toolSlug) => {
              const tool = getToolSEO(toolSlug);
              if (!tool) {
                return null;
              }

              return (
                <Link
                  key={toolSlug}
                  to={`/tools/${toolSlug}`}
                  className="rounded-2xl border border-slate-200 p-5 transition-colors hover:border-primary-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-primary-600 dark:hover:bg-slate-800"
                >
                  <p className="text-sm font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
                    {tool.category}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    {t(`tools.${tool.i18nKey}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {t(`tools.${tool.i18nKey}.shortDesc`)}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
                    {copy.openTool}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {copy.selectionHeading}
          </h2>
          <ul className="mt-5 space-y-3">
            {copy.chooseBullets.map((item) => (
              <li key={item} className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {contentSections.length > 0 ? (
          <section className="grid gap-6 lg:grid-cols-2">
            {contentSections.map((section) => (
              <article key={section.heading.en} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {getLocalizedText(section.heading, locale)}
                </h2>
                <p className="mt-4 leading-8 text-slate-700 dark:text-slate-300">
                  {getLocalizedText(section.body, locale)}
                </p>
              </article>
            ))}
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {copy.relatedHeading}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {relatedCollections.map((collection) => {
              const collectionTitle = interpolateTemplate(getLocalizedText(collection.titleTemplate, locale), {
                brand: 'Dociva',
                focusKeyword: getLocalizedText(collection.focusKeyword, locale),
              });

              return (
                <Link
                  key={collection.slug}
                  to={locale === 'ar' ? `/ar/${collection.slug}` : `/${collection.slug}`}
                  className="rounded-2xl border border-slate-200 p-5 transition-colors hover:border-primary-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-primary-600 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                    <Link2 className="h-4 w-4" />
                    <span className="text-sm font-medium">{locale === 'ar' ? `/ar/${collection.slug}` : `/${collection.slug}`}</span>
                  </div>
                  <p className="mt-3 font-semibold text-slate-900 dark:text-white">{collectionTitle}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <FAQSection faqs={faqItems} />
      </div>
    </>
  );
}