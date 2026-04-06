import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minimize2 } from 'lucide-react';
import ToolTemplate, { ToolConfig, ToolTemplateProps } from '@/components/shared/ToolTemplate';

type Quality = 'low' | 'medium' | 'high';

export default function PdfCompressor() {
  const { t } = useTranslation();
  const [quality, setQuality] = useState<Quality>('medium');

  const toolConfig: ToolConfig = {
    slug: 'compress-pdf',
    icon: Minimize2,
    color: 'orange',
    i18nKey: 'tools.compressPdf',
    endpoint: '/compress/pdf',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
  };

  const qualityOptions: { value: Quality; label: string; desc: string }[] = [
    { value: 'low', label: t('tools.compressPdf.qualityLow'), desc: '72 DPI' },
    { value: 'medium', label: t('tools.compressPdf.qualityMedium'), desc: '150 DPI' },
    { value: 'high', label: t('tools.compressPdf.qualityHigh'), desc: '300 DPI' },
  ];

  const getExtraData = () => ({ quality });

  return (
    <ToolTemplate config={toolConfig} onGetExtraData={getExtraData}>
      {(props: ToolTemplateProps) => (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t('tools.compressPdf.quality', { defaultValue: 'Compression Quality' })}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              {qualityOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setQuality(opt.value)}
                  className={`rounded-xl p-3 text-center ring-1 transition-all ${
                    quality === opt.value
                      ? 'bg-primary-50 dark:bg-primary-900/20 ring-primary-300 dark:ring-primary-700 text-primary-700 dark:text-primary-400'
                      : 'bg-white dark:bg-slate-700 ring-slate-200 dark:ring-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </ToolTemplate>
  );
}
