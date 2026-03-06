import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import type { Flowchart } from './types';

interface FlowGenerationProps {
  /** Called when generation is "done" (simulated progress + already-extracted flows) */
  flowcharts: Flowchart[];
  selectedCount: number;
  onDone: () => void;
}

export default function FlowGeneration({ flowcharts, selectedCount, onDone }: FlowGenerationProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  // Simulate a smooth progress bar while the flowcharts already exist in state
  useEffect(() => {
    const total = 100;
    const stepMs = 40;
    let current = 0;
    const timer = setInterval(() => {
      current += Math.random() * 12 + 3;
      if (current >= total) {
        current = total;
        clearInterval(timer);
        setDone(true);
      }
      setProgress(Math.min(current, total));
    }, stepMs);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center dark:bg-slate-800 dark:ring-slate-700">
      {!done ? (
        <>
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary-500" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {t('tools.pdfFlowchart.generating')}
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t('tools.pdfFlowchart.generatingDesc')}
          </p>

          {/* Progress bar */}
          <div className="mx-auto mt-6 max-w-md">
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-2.5 rounded-full bg-primary-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">{Math.round(progress)}%</p>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            {t('tools.pdfFlowchart.generatingFor', { count: selectedCount })}
          </p>
        </>
      ) : (
        <>
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            {t('tools.pdfFlowchart.flowReady')}
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t('tools.pdfFlowchart.flowReadyCount', { count: flowcharts.length })}
          </p>
          <button onClick={onDone} className="btn-primary mt-6">
            {t('tools.pdfFlowchart.viewResults')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
