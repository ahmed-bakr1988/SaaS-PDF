import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
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
} from 'lucide-react';
import ToolCard from '@/components/shared/ToolCard';
import HeroUploadZone from '@/components/shared/HeroUploadZone';
import AdSlot from '@/components/layout/AdSlot';

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
];

const otherTools: ToolInfo[] = [
  { key: 'imageConvert', path: '/tools/image-converter', icon: <ImageIcon className="h-6 w-6 text-purple-600" />, bgColor: 'bg-purple-50' },
  { key: 'imageResize', path: '/tools/image-resize', icon: <Scaling className="h-6 w-6 text-teal-600" />, bgColor: 'bg-teal-50' },
  { key: 'videoToGif', path: '/tools/video-to-gif', icon: <Film className="h-6 w-6 text-emerald-600" />, bgColor: 'bg-emerald-50' },
  { key: 'wordCounter', path: '/tools/word-counter', icon: <Hash className="h-6 w-6 text-blue-600" />, bgColor: 'bg-blue-50' },
  { key: 'textCleaner', path: '/tools/text-cleaner', icon: <Eraser className="h-6 w-6 text-indigo-600" />, bgColor: 'bg-indigo-50' },
];

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('common.appName')} — {t('home.heroSub')}</title>
        <meta name="description" content={t('home.heroSub')} />
        <link rel="canonical" href={window.location.origin} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: t('common.appName'),
            url: window.location.origin,
            description: t('home.heroSub'),
            potentialAction: {
              '@type': 'SearchAction',
              target: `${window.location.origin}/tools/{search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          })}
        </script>
      </Helmet>

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

      {/* Tools Grid */}
      <section>
        <h2 className="mb-6 text-center text-xl font-semibold text-slate-800 dark:text-slate-200">
          {t('home.pdfTools')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-10">
          {pdfTools.map((tool) => (
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
          {otherTools.map((tool) => (
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
