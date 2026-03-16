import { useDeferredValue } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import SEOHead from '@/components/seo/SEOHead';
import { generateOrganization } from '@/utils/seo';
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
} from 'lucide-react';
import ToolCard from '@/components/shared/ToolCard';
import HeroUploadZone from '@/components/shared/HeroUploadZone';
import AdSlot from '@/components/layout/AdSlot';
import SocialProofStrip from '@/components/shared/SocialProofStrip';

interface ToolInfo {
  key: string;
  path: string;
  icon: React.ReactNode;
  bgColor: string;
}

const pdfTools: ToolInfo[] = [
  { key: 'pdfEditor', path: '/tools/pdf-editor', icon: <PenLine className="h-6 w-6 text-rose-600" />, bgColor: 'bg-rose-50' },
  { key: 'pdfToWord', path: '/tools/pdf-to-word', icon: <FileText className="h-6 w-6 text-red-600" />, bgColor: 'bg-red-50' },
  { key: 'wordToPdf', path: '/tools/word-to-pdf', icon: <FileOutput className="h-6 w-6 text-blue-600" />, bgColor: 'bg-blue-50' },
  { key: 'compressPdf', path: '/tools/compress-pdf', icon: <Minimize2 className="h-6 w-6 text-orange-600" />, bgColor: 'bg-orange-50' },
  { key: 'mergePdf', path: '/tools/merge-pdf', icon: <Layers className="h-6 w-6 text-violet-600" />, bgColor: 'bg-violet-50' },
  { key: 'splitPdf', path: '/tools/split-pdf', icon: <Scissors className="h-6 w-6 text-pink-600" />, bgColor: 'bg-pink-50' },
  { key: 'rotatePdf', path: '/tools/rotate-pdf', icon: <RotateCw className="h-6 w-6 text-teal-600" />, bgColor: 'bg-teal-50' },
  { key: 'pdfToImages', path: '/tools/pdf-to-images', icon: <Image className="h-6 w-6 text-amber-600" />, bgColor: 'bg-amber-50' },
  { key: 'imagesToPdf', path: '/tools/images-to-pdf', icon: <FileImage className="h-6 w-6 text-lime-600" />, bgColor: 'bg-lime-50' },
  { key: 'watermarkPdf', path: '/tools/watermark-pdf', icon: <Droplets className="h-6 w-6 text-cyan-600" />, bgColor: 'bg-cyan-50' },
  { key: 'protectPdf', path: '/tools/protect-pdf', icon: <Lock className="h-6 w-6 text-red-600" />, bgColor: 'bg-red-50' },
  { key: 'unlockPdf', path: '/tools/unlock-pdf', icon: <Unlock className="h-6 w-6 text-green-600" />, bgColor: 'bg-green-50' },
  { key: 'pageNumbers', path: '/tools/page-numbers', icon: <ListOrdered className="h-6 w-6 text-sky-600" />, bgColor: 'bg-sky-50' },
  { key: 'pdfFlowchart', path: '/tools/pdf-flowchart', icon: <GitBranch className="h-6 w-6 text-indigo-600" />, bgColor: 'bg-indigo-50' },
  { key: 'pdfToExcel', path: '/tools/pdf-to-excel', icon: <Sheet className="h-6 w-6 text-green-600" />, bgColor: 'bg-green-50' },
  { key: 'removeWatermark', path: '/tools/remove-watermark-pdf', icon: <Droplets className="h-6 w-6 text-rose-600" />, bgColor: 'bg-rose-50' },
  { key: 'reorderPdf', path: '/tools/reorder-pdf', icon: <ArrowUpDown className="h-6 w-6 text-violet-600" />, bgColor: 'bg-violet-50' },
  { key: 'extractPages', path: '/tools/extract-pages', icon: <FileOutput className="h-6 w-6 text-amber-600" />, bgColor: 'bg-amber-50' },
  { key: 'chatPdf', path: '/tools/chat-pdf', icon: <MessageSquare className="h-6 w-6 text-blue-600" />, bgColor: 'bg-blue-50' },
  { key: 'summarizePdf', path: '/tools/summarize-pdf', icon: <FileText className="h-6 w-6 text-emerald-600" />, bgColor: 'bg-emerald-50' },
  { key: 'translatePdf', path: '/tools/translate-pdf', icon: <Languages className="h-6 w-6 text-purple-600" />, bgColor: 'bg-purple-50' },
  { key: 'tableExtractor', path: '/tools/extract-tables', icon: <Table className="h-6 w-6 text-teal-600" />, bgColor: 'bg-teal-50' },
];

const otherTools: ToolInfo[] = [
  { key: 'imageConvert', path: '/tools/image-converter', icon: <ImageIcon className="h-6 w-6 text-purple-600" />, bgColor: 'bg-purple-50' },
  { key: 'imageResize', path: '/tools/image-resize', icon: <Scaling className="h-6 w-6 text-teal-600" />, bgColor: 'bg-teal-50' },
  { key: 'compressImage', path: '/tools/compress-image', icon: <Minimize2 className="h-6 w-6 text-orange-600" />, bgColor: 'bg-orange-50' },
  { key: 'ocr', path: '/tools/ocr', icon: <ScanText className="h-6 w-6 text-amber-600" />, bgColor: 'bg-amber-50' },
  { key: 'removeBg', path: '/tools/remove-background', icon: <Eraser className="h-6 w-6 text-fuchsia-600" />, bgColor: 'bg-fuchsia-50' },
  { key: 'videoToGif', path: '/tools/video-to-gif', icon: <Film className="h-6 w-6 text-emerald-600" />, bgColor: 'bg-emerald-50' },
  { key: 'qrCode', path: '/tools/qr-code', icon: <QrCode className="h-6 w-6 text-indigo-600" />, bgColor: 'bg-indigo-50' },
  { key: 'htmlToPdf', path: '/tools/html-to-pdf', icon: <Code className="h-6 w-6 text-sky-600" />, bgColor: 'bg-sky-50' },
  { key: 'wordCounter', path: '/tools/word-counter', icon: <Hash className="h-6 w-6 text-blue-600" />, bgColor: 'bg-blue-50' },
  { key: 'textCleaner', path: '/tools/text-cleaner', icon: <Eraser className="h-6 w-6 text-indigo-600" />, bgColor: 'bg-indigo-50' },
];

export default function HomePage() {
  const { t } = useTranslation();
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
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: t('common.appName'),
            url: window.location.origin,
            description: t('home.heroSub'),
            potentialAction: {
              '@type': 'SearchAction',
              target: `${window.location.origin}/?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
          generateOrganization(window.location.origin),
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
