import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Hash } from 'lucide-react';
import AdSlot from '@/components/layout/AdSlot';
import { countText, type TextStats } from '@/utils/textTools';
import { generateToolSchema } from '@/utils/seo';

export default function WordCounter() {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const stats: TextStats = countText(text);

  const statItems = [
    { label: t('tools.wordCounter.words'), value: stats.words, color: 'bg-blue-50 text-blue-700' },
    { label: t('tools.wordCounter.characters'), value: stats.characters, color: 'bg-purple-50 text-purple-700' },
    { label: t('tools.wordCounter.sentences'), value: stats.sentences, color: 'bg-emerald-50 text-emerald-700' },
    { label: t('tools.wordCounter.paragraphs'), value: stats.paragraphs, color: 'bg-orange-50 text-orange-700' },
  ];

  const schema = generateToolSchema({
    name: t('tools.wordCounter.title'),
    description: t('tools.wordCounter.description'),
    url: `${window.location.origin}/tools/word-counter`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.wordCounter.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.wordCounter.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/word-counter`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <Hash className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="section-heading">{t('tools.wordCounter.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.wordCounter.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {/* Stats Grid */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statItems.map((item) => (
            <div
              key={item.label}
              className={`rounded-xl p-4 text-center ${item.color}`}
            >
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs font-medium opacity-80">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Reading Time */}
        {stats.words > 0 && (
          <p className="mb-4 text-center text-sm text-slate-500">
            📖 Reading time: {stats.readingTime}
          </p>
        )}

        {/* Text Input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('tools.wordCounter.placeholder')}
          className="input-field min-h-[300px] resize-y font-mono text-sm"
          dir="auto"
        />

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}
