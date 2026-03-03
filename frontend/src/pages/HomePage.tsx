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
} from 'lucide-react';
import ToolCard from '@/components/shared/ToolCard';
import AdSlot from '@/components/layout/AdSlot';

interface ToolInfo {
  key: string;
  path: string;
  icon: React.ReactNode;
  bgColor: string;
}

const tools: ToolInfo[] = [
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
  { key: 'imageConvert', path: '/tools/image-converter', icon: <ImageIcon className="h-6 w-6 text-purple-600" />, bgColor: 'bg-purple-50' },
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
      <section className="py-12 text-center sm:py-16">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          {t('home.hero')}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500 dark:text-slate-400">
          {t('home.heroSub')}
        </p>
      </section>

      {/* Ad Slot */}
      <AdSlot slot="home-top" format="horizontal" className="mb-8" />

      {/* Tools Grid */}
      <section>
        <h2 className="mb-6 text-center text-xl font-semibold text-slate-800 dark:text-slate-200">
          {t('home.popularTools')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
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

      {/* Ad Slot - Bottom */}
      <AdSlot slot="home-bottom" className="mt-12" />
    </>
  );
}
