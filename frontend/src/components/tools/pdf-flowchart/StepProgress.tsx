import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { WIZARD_STEPS, type WizardStep } from './types';

interface StepProgressProps {
  currentStep: WizardStep;
  className?: string;
}

export default function StepProgress({ currentStep, className }: StepProgressProps) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      {/* Progress bar */}
      <div className="relative mb-3">
        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-1.5 rounded-full bg-primary-500 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step labels */}
      <div className="grid grid-cols-4 gap-2">
        {WIZARD_STEPS.map((step, idx) => {
          const done = idx < currentStep;
          const active = idx === currentStep;
          return (
            <div key={step.key} className="flex flex-col items-center text-center">
              <div
                className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? 'bg-primary-500 text-white'
                    : active
                      ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-400 dark:bg-primary-900/40 dark:text-primary-300'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={`text-[11px] leading-tight ${
                  active ? 'font-semibold text-primary-700 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t(step.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
