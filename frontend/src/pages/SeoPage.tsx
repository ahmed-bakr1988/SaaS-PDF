import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle, FileText, Link2 } from 'lucide-react';
import SEOHead from '@/components/seo/SEOHead';
import FAQSection from '@/components/seo/FAQSection';
import RelatedTools from '@/components/seo/RelatedTools';
import SuggestedTools from '@/components/seo/SuggestedTools';
import {
  getLocalizedText,
  getLocalizedTextList,
  getProgrammaticToolPage,
  getSeoCollectionPage,
  interpolateTemplate,
  normalizeSeoLocale,
} from '@/config/seoPages';
import { getToolSEO } from '@/config/seoData';
import {
  generateBreadcrumbs,
  generateFAQ,
  generateHowTo,
  generateToolSchema,
  generateWebPage,
  getSiteOrigin,
} from '@/utils/seo';
import NotFoundPage from '@/pages/NotFoundPage';

interface SeoPageProps {
  slug: string;
}

const COPY = {
  en: {
    cta: 'Open the tool',
    introHeading: 'What this page helps you do',
    workflowHeading: 'Recommended workflow',
    useCasesHeading: 'When this workflow fits best',
    relatedHeading: 'Related guides',
    internalLinksHeading: 'You may also need',
    supportHeading: 'Built for fast bilingual workflows',
    supportBody:
      'Dociva supports English and Arabic user flows, which makes these landing pages usable for both local and international search traffic.',
    stepsName: 'How to use this workflow',
    breadcrumbLabel: 'Guides',
    popularTools: 'Popular tools',
  },
  ar: {
    cta: 'افتح الأداة',
    introHeading: 'ما الذي تساعدك عليه هذه الصفحة',
    workflowHeading: 'سير العمل المقترح',
    useCasesHeading: 'متى يكون هذا المسار مناسباً',
    relatedHeading: 'صفحات ذات صلة',
    internalLinksHeading: 'قد تحتاج أيضاً',
    supportHeading: 'مصممة لسير عمل ثنائي اللغة بسرعة',
    supportBody:
      'يدعم Dociva سير العمل بالإنجليزية والعربية، مما يجعل صفحات الهبوط هذه قابلة للاستخدام مع الترافيك المحلي والدولي معاً.',
    stepsName: 'كيفية استخدام هذا المسار',
    breadcrumbLabel: 'الأدلة',
    popularTools: 'أدوات شائعة',
  },
} as const;

export default function SeoPage({ slug }: SeoPageProps) {
  const { t, i18n } = useTranslation();
  const locale = normalizeSeoLocale(i18n.language);
  const copy = COPY[locale];
  const page = getProgrammaticToolPage(slug);

  if (!page) {
    return <NotFoundPage />;
  }

  const tool = getToolSEO(page.toolSlug);
  if (!tool) {
    return <NotFoundPage />;
  }

  const toolTitle = t(`tools.${tool.i18nKey}.title`);
  const toolDescription = t(`tools.${tool.i18nKey}.description`);
  const steps = t(`seo.${tool.i18nKey}.howToUse`, { returnObjects: true }) as string[];
  const benefits = t(`seo.${tool.i18nKey}.benefits`, { returnObjects: true }) as string[];
  const useCases = t(`seo.${tool.i18nKey}.useCases`, { returnObjects: true }) as string[];

  const focusKeyword = getLocalizedText(page.focusKeyword, locale);
  const keywords = [focusKeyword, ...getLocalizedTextList(page.supportingKeywords, locale)].join(', ');
  const tokens = {
    brand: 'Dociva',
    focusKeyword,
  };
  const title = interpolateTemplate(getLocalizedText(page.titleTemplate, locale), tokens);
  const description = interpolateTemplate(getLocalizedText(page.descriptionTemplate, locale), tokens);
  const path = locale === 'ar' ? `/ar/${page.slug}` : `/${page.slug}`;
  const siteOrigin = getSiteOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  const url = `${siteOrigin}${path}`;
  const faqItems = page.faqTemplates.map((item) => ({
    question: getLocalizedText(item.question, locale),
    answer: getLocalizedText(item.answer, locale),
  }));
  const relatedCollections = page.relatedCollectionSlugs
    .map((collectionSlug) => getSeoCollectionPage(collectionSlug))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const introBody = `${toolDescription} ${description}`;
  const workflowBody = `${t(`seo.${tool.i18nKey}.whatItDoes`)} ${t(`tools.${tool.i18nKey}.shortDesc`)}`;
  const fallbackBenefits = tool.features;
  const resolvedBenefits = Array.isArray(benefits) && benefits.length > 0 ? benefits : fallbackBenefits;
  const resolvedUseCases = Array.isArray(useCases) && useCases.length > 0 ? useCases : tool.relatedSlugs.map((relatedSlug) => {
    const relatedTool = getToolSEO(relatedSlug);
    return relatedTool ? t(`tools.${relatedTool.i18nKey}.title`) : relatedSlug;
  });
  const localizedCollectionPath = (collectionSlug: string) => (locale === 'ar' ? `/ar/${collectionSlug}` : `/${collectionSlug}`);

  const jsonLd = [
    generateWebPage({
      name: title,
      description,
      url,
    }),
    generateToolSchema({
      name: toolTitle,
      description,
      url,
      category: tool.category === 'PDF' ? 'UtilitiesApplication' : 'WebApplication',
    }),
    generateBreadcrumbs([
      { name: t('common.home'), url: siteOrigin },
      { name: copy.breadcrumbLabel, url: siteOrigin },
      { name: title, url },
    ]),
    generateHowTo({
      name: copy.stepsName,
      description,
      steps: Array.isArray(steps) ? steps : [],
      url,
    }),
    generateFAQ(faqItems),
  ];

  return (
    <>
      <SEOHead title={title} description={description} path={path} keywords={keywords} jsonLd={jsonLd} />

      <div className="mx-auto max-w-6xl space-y-12">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
                {focusKeyword}
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-400">
                {description}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={`/tools/${page.toolSlug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  {copy.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <span className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  {toolTitle}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{copy.popularTools}</p>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{toolTitle}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {toolDescription}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {resolvedBenefits.slice(0, 4).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {copy.introHeading}
            </h2>
            <p className="mt-4 leading-8 text-slate-700 dark:text-slate-300">
              {introBody}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {copy.workflowHeading}
            </h2>
            <p className="mt-4 leading-8 text-slate-700 dark:text-slate-300">
              {workflowBody}
            </p>
            <ol className="mt-5 list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-300">
              {(Array.isArray(steps) ? steps : []).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {copy.useCasesHeading}
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {resolvedUseCases.slice(0, 6).map((item) => (
              <div key={item} className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </section>

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
                  to={localizedCollectionPath(collection.slug)}
                  className="rounded-2xl border border-slate-200 p-5 transition-colors hover:border-primary-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-primary-600 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                    <Link2 className="h-4 w-4" />
                    <span className="text-sm font-medium">{localizedCollectionPath(collection.slug)}</span>
                  </div>
                  <p className="mt-3 font-semibold text-slate-900 dark:text-white">{collectionTitle}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {interpolateTemplate(getLocalizedText(collection.descriptionTemplate, locale), {
                      brand: 'Dociva',
                      focusKeyword: getLocalizedText(collection.focusKeyword, locale),
                    })}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {copy.internalLinksHeading}
          </h2>
          <RelatedTools currentSlug={page.toolSlug} />
          <SuggestedTools currentSlug={page.toolSlug} limit={4} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {copy.supportHeading}
          </h2>
          <p className="mt-4 leading-8 text-slate-700 dark:text-slate-300">{copy.supportBody}</p>
        </section>

        <FAQSection faqs={faqItems} />
      </div>
    </>
  );
}