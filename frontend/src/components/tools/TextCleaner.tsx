import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Eraser, Copy, Check } from 'lucide-react';
import { removeExtraSpaces, convertCase, removeDiacritics } from '@/utils/textTools';
import { generateToolSchema } from '@/utils/seo';

export default function TextCleaner() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const applyTransform = (type: string) => {
    let result = input;
    switch (type) {
      case 'removeSpaces':
        result = removeExtraSpaces(input);
        break;
      case 'upper':
        result = convertCase(input, 'upper');
        break;
      case 'lower':
        result = convertCase(input, 'lower');
        break;
      case 'title':
        result = convertCase(input, 'title');
        break;
      case 'sentence':
        result = convertCase(input, 'sentence');
        break;
      case 'removeDiacritics':
        result = removeDiacritics(input);
        break;
      default:
        break;
    }
    setOutput(result);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output || input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const buttons = [
    { key: 'removeSpaces', label: t('tools.textCleaner.removeSpaces'), color: 'bg-blue-600 hover:bg-blue-700' },
    { key: 'upper', label: t('tools.textCleaner.toUpperCase'), color: 'bg-purple-600 hover:bg-purple-700' },
    { key: 'lower', label: t('tools.textCleaner.toLowerCase'), color: 'bg-emerald-600 hover:bg-emerald-700' },
    { key: 'title', label: t('tools.textCleaner.toTitleCase'), color: 'bg-orange-600 hover:bg-orange-700' },
    { key: 'sentence', label: t('tools.textCleaner.toSentenceCase'), color: 'bg-rose-600 hover:bg-rose-700' },
    { key: 'removeDiacritics', label: t('tools.textCleaner.removeDiacritics'), color: 'bg-amber-600 hover:bg-amber-700' },
  ];

  const schema = generateToolSchema({
    name: t('tools.textCleaner.title'),
    description: t('tools.textCleaner.description'),
    url: `${window.location.origin}/tools/text-cleaner`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.textCleaner.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.textCleaner.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/text-cleaner`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">
            <Eraser className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="section-heading">{t('tools.textCleaner.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.textCleaner.description')}</p>
        </div>
        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setCopied(false);
          }}
          placeholder={t('tools.wordCounter.placeholder')}
          className="input-field mb-4 min-h-[150px] resize-y text-sm"
          dir="auto"
        />

        {/* Transform Buttons */}
        <div className="mb-4 flex flex-wrap gap-2">
          {buttons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => applyTransform(btn.key)}
              disabled={!input.trim()}
              className={`rounded-lg px-4 py-2 text-xs font-medium text-white transition-colors disabled:opacity-40 ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Output */}
        {output && (
          <div className="relative">
            <textarea
              value={output}
              readOnly
              className="input-field min-h-[150px] resize-y bg-emerald-50 text-sm"
              dir="auto"
            />
            <button
              onClick={copyToClipboard}
              className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  {t('tools.textCleaner.copyResult')}
                </>
              )}
            </button>
          </div>
        )}      </div>
    </>
  );
}
