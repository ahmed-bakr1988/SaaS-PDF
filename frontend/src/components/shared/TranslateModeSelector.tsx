import { useTranslation } from 'react-i18next';
import { FileText, Layout, Eye, Crown, Check } from 'lucide-react';
import type { TranslateEstimateResponse } from '@/services/api';

export type TranslateMode = 'text' | 'layout' | 'vision';

interface TranslateModeSelectorProps {
  estimate: TranslateEstimateResponse;
  value: TranslateMode;
  onChange: (mode: TranslateMode) => void;
}

const MODE_META: Record<TranslateMode, { icon: typeof FileText; i18nLabel: string; i18nDesc: string }> = {
  text: { icon: FileText, i18nLabel: 'tools.translatePdf.modeText', i18nDesc: 'tools.translatePdf.modeTextDesc' },
  layout: { icon: Layout, i18nLabel: 'tools.translatePdf.modeLayout', i18nDesc: 'tools.translatePdf.modeLayoutDesc' },
  vision: { icon: Eye, i18nLabel: 'tools.translatePdf.modeVision', i18nDesc: 'tools.translatePdf.modeVisionDesc' },
};

export default function TranslateModeSelector({ estimate, value, onChange }: TranslateModeSelectorProps) {
  const { t } = useTranslation();
  const isPro = estimate.plan === 'pro';

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {t('tools.translatePdf.selectMode')}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {(['text', 'layout', 'vision'] as const).map((mode) => {
          const meta = MODE_META[mode];
          const info = estimate.modes[mode];
          const Icon = meta.icon;
          const isRecommended = estimate.analysis.recommendation === mode;
          const needsPro = mode !== 'text' && !isPro;
          const disabled = !info.available || needsPro;
          const selected = value === mode;

          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => onChange(mode)}
              className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                selected
                  ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500 dark:border-purple-400 dark:bg-purple-900/20 dark:ring-purple-400'
                  : disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800/50'
                    : 'cursor-pointer border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-600'
              }`}
            >
              {/* Badges row */}
              <div className="flex w-full items-center justify-between">
                <Icon className={`h-5 w-5 ${selected ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <div className="flex items-center gap-1.5">
                  {isRecommended && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                      {t('tools.translatePdf.recommended')}
                    </span>
                  )}
                  {mode !== 'text' && (
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                      <Crown className="h-3 w-3" /> {t('tools.translatePdf.proOnly')}
                    </span>
                  )}
                  {selected && <Check className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                </div>
              </div>

              {/* Label & description */}
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t(meta.i18nLabel)}
                </span>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t(meta.i18nDesc)}
                </p>
              </div>

              {/* Credits */}
              <span className="mt-auto text-xs font-medium text-slate-600 dark:text-slate-300">
                {t('tools.translatePdf.creditsLabel', { count: info.credits })}
              </span>

              {/* Warning / unavailable */}
              {info.warning && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">{info.warning}</p>
              )}
              {!info.available && (
                <p className="text-[11px] text-red-500 dark:text-red-400">
                  {t('tools.translatePdf.modeUnavailable')}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
