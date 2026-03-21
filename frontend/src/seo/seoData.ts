import seoSeedConfig from '@/seo/seoData.json';
import type {
  LocalizedText,
  LocalizedTextList,
  ProgrammaticToolPage,
  SeoCollectionPage,
  SeoFaqTemplate,
  SeoLocale,
} from '@/config/seoPages';

interface ToolPageSeed {
  slug: string;
  toolSlug: string;
  category: 'PDF' | 'Image' | 'AI' | 'Convert' | 'Utility';
  focusKeyword: LocalizedText;
  supportingKeywords: LocalizedTextList;
  benefit: LocalizedText;
  useCase: LocalizedText;
  relatedCollectionSlugs: string[];
}

interface CollectionPageSeed {
  slug: string;
  focusKeyword: LocalizedText;
  supportingKeywords: LocalizedTextList;
  introAngle: LocalizedText;
  targetToolSlugs: string[];
  relatedCollectionSlugs: string[];
}

interface SeoSeedConfig {
  toolPageSeeds: ToolPageSeed[];
  collectionPageSeeds: CollectionPageSeed[];
}

const seedConfig = seoSeedConfig as SeoSeedConfig;

function buildToolFaqs(seed: ToolPageSeed): SeoFaqTemplate[] {
  return [
    {
      question: {
        en: `When should I use ${seed.focusKeyword.en}?`,
        ar: `متى أستخدم ${seed.focusKeyword.ar}؟`,
      },
      answer: {
        en: `${seed.useCase.en} ${seed.benefit.en}`,
        ar: `${seed.useCase.ar} ${seed.benefit.ar}`,
      },
    },
    {
      question: {
        en: `What makes ${seed.focusKeyword.en} useful online?`,
        ar: `ما الذي يجعل ${seed.focusKeyword.ar} مفيداً أونلاين؟`,
      },
      answer: {
        en: `Dociva helps you handle this workflow in the browser with secure processing, fast output, and no installation. ${seed.benefit.en}`,
        ar: `يساعدك Dociva على تنفيذ هذا المسار من المتصفح مع معالجة آمنة ونتيجة سريعة وبدون تثبيت. ${seed.benefit.ar}`,
      },
    },
  ];
}

function buildCollectionFaqs(seed: CollectionPageSeed): SeoFaqTemplate[] {
  return [
    {
      question: {
        en: `What is included in ${seed.focusKeyword.en}?`,
        ar: `ماذا تتضمن ${seed.focusKeyword.ar}؟`,
      },
      answer: {
        en: `${seed.introAngle.en} This page brings together the main workflows users usually need before downloading, sharing, or archiving files.`,
        ar: `${seed.introAngle.ar} تجمع هذه الصفحة أهم المسارات التي يحتاجها المستخدمون عادة قبل التنزيل أو المشاركة أو الأرشفة.`,
      },
    },
    {
      question: {
        en: `How do I choose the right workflow from ${seed.focusKeyword.en}?`,
        ar: `كيف أختار المسار المناسب من ${seed.focusKeyword.ar}؟`,
      },
      answer: {
        en: `Start with the outcome you need, then open the matching tool. This collection is designed to reduce guesswork and move directly into execution.`,
        ar: `ابدأ بالنتيجة التي تحتاجها ثم افتح الأداة المطابقة. صُممت هذه المجموعة لتقليل التخمين والانتقال مباشرة إلى التنفيذ.`,
      },
    },
  ];
}

function buildToolSections(seed: ToolPageSeed): Array<{ heading: LocalizedText; body: LocalizedText }> {
  return [
    {
      heading: {
        en: `Why people search for ${seed.focusKeyword.en}`,
        ar: `لماذا يبحث المستخدمون عن ${seed.focusKeyword.ar}`,
      },
      body: {
        en: seed.benefit.en,
        ar: seed.benefit.ar,
      },
    },
    {
      heading: {
        en: 'Common use cases',
        ar: 'حالات الاستخدام الشائعة',
      },
      body: {
        en: seed.useCase.en,
        ar: seed.useCase.ar,
      },
    },
  ];
}

function buildCollectionSections(seed: CollectionPageSeed): Array<{ heading: LocalizedText; body: LocalizedText }> {
  return [
    {
      heading: {
        en: `What this ${seed.focusKeyword.en} page covers`,
        ar: `ما الذي تغطيه صفحة ${seed.focusKeyword.ar}`,
      },
      body: {
        en: seed.introAngle.en,
        ar: seed.introAngle.ar,
      },
    },
    {
      heading: {
        en: 'How to use this collection',
        ar: 'كيفية استخدام هذه المجموعة',
      },
      body: {
        en: 'Choose the workflow that matches the output you need first, then chain cleanup, security, or AI tools only when the file requires them.',
        ar: 'اختر أولاً مسار العمل الذي يطابق النتيجة التي تحتاجها، ثم أضف أدوات التنظيف أو الأمان أو الذكاء الاصطناعي فقط عندما يتطلب الملف ذلك.',
      },
    },
  ];
}

export const PROGRAMMATIC_TOOL_PAGES: ProgrammaticToolPage[] = seedConfig.toolPageSeeds.map((seed) => ({
  slug: seed.slug,
  toolSlug: seed.toolSlug,
  category: seed.category,
  focusKeyword: seed.focusKeyword,
  supportingKeywords: seed.supportingKeywords,
  titleTemplate: {
    en: `{{focusKeyword}} online | {{brand}}`,
    ar: `{{focusKeyword}} أونلاين | {{brand}}`,
  },
  descriptionTemplate: {
    en: `${seed.benefit.en} ${seed.useCase.en} Use {{brand}} to complete this workflow online with no signup required.`,
    ar: `${seed.benefit.ar} ${seed.useCase.ar} استخدم {{brand}} لإتمام هذا المسار أونلاين بدون تسجيل.`,
  },
  faqTemplates: buildToolFaqs(seed),
  relatedCollectionSlugs: seed.relatedCollectionSlugs,
  contentSections: buildToolSections(seed),
}));

export const SEO_COLLECTION_PAGES: SeoCollectionPage[] = seedConfig.collectionPageSeeds.map((seed) => ({
  slug: seed.slug,
  focusKeyword: seed.focusKeyword,
  supportingKeywords: seed.supportingKeywords,
  titleTemplate: {
    en: `{{focusKeyword}} | {{brand}}`,
    ar: `{{focusKeyword}} | {{brand}}`,
  },
  descriptionTemplate: {
    en: `${seed.introAngle.en} Browse the most relevant workflows in one focused landing page.`,
    ar: `${seed.introAngle.ar} تصفح أكثر المسارات صلة في صفحة هبوط واحدة مركزة.`,
  },
  introTemplate: {
    en: seed.introAngle.en,
    ar: seed.introAngle.ar,
  },
  targetToolSlugs: seed.targetToolSlugs,
  faqTemplates: buildCollectionFaqs(seed),
  relatedCollectionSlugs: seed.relatedCollectionSlugs,
  contentSections: buildCollectionSections(seed),
}));

export const SEO_TOTAL_PAGE_COUNT = PROGRAMMATIC_TOOL_PAGES.length + SEO_COLLECTION_PAGES.length;

export function getLocalizedSeoLandingPaths(locale: SeoLocale): string[] {
  const prefix = locale === 'ar' ? '/ar' : '';
  return [
    ...PROGRAMMATIC_TOOL_PAGES.map((page) => `${prefix}/${page.slug}`),
    ...SEO_COLLECTION_PAGES.map((page) => `${prefix}/${page.slug}`),
  ];
}