import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Eye,
  X,
  RotateCcw,
  Plus,
} from 'lucide-react';
import type { Procedure, PDFPage } from './types';

interface ProcedureSelectionProps {
  procedures: Procedure[];
  rejectedProcedures: Procedure[];
  pages: PDFPage[];
  onContinue: (selectedIds: string[]) => void;
  onManualAdd: () => void;
  onReject: (id: string) => void;
  onRestore: (id: string) => void;
  onViewProcedure: (proc: Procedure) => void;
  onBack: () => void;
}

export default function ProcedureSelection({
  procedures,
  rejectedProcedures,
  pages,
  onContinue,
  onManualAdd,
  onReject,
  onRestore,
  onViewProcedure,
  onBack,
}: ProcedureSelectionProps) {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    procedures.map((p) => p.id),
  );

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const getComplexity = (count: number) => {
    if (count <= 4) return { label: t('tools.pdfFlowchart.complexity.simple'), color: 'bg-green-100 text-green-700' };
    if (count <= 8) return { label: t('tools.pdfFlowchart.complexity.medium'), color: 'bg-yellow-100 text-yellow-700' };
    return { label: t('tools.pdfFlowchart.complexity.complex'), color: 'bg-red-100 text-red-700' };
  };

  const getPriorityIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('emergency') || lower.includes('safety') || lower.includes('طوارئ') || lower.includes('أمان'))
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <FileText className="h-4 w-4 text-slate-400" />;
  };

  const totalFound = procedures.length + rejectedProcedures.length;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {t('tools.pdfFlowchart.selectProcedures')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('tools.pdfFlowchart.selectProceduresDesc')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {t('tools.pdfFlowchart.proceduresFound', { count: totalFound })}
          </span>
          {rejectedProcedures.length > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              {rejectedProcedures.length} {t('tools.pdfFlowchart.rejected')}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedIds(procedures.map((p) => p.id))}
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          {t('tools.pdfFlowchart.selectAll')}
        </button>
        <span className="text-slate-300">|</span>
        <button
          onClick={() => setSelectedIds([])}
          className="text-sm font-medium text-slate-500 hover:underline"
        >
          {t('tools.pdfFlowchart.deselectAll')}
        </button>
        <span className="text-slate-300">|</span>
        <button
          onClick={onManualAdd}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('tools.pdfFlowchart.addManual')}
        </button>
      </div>

      {/* Procedures list */}
      {procedures.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-slate-500">{t('tools.pdfFlowchart.noProcedures')}</p>
        </div>
      ) : (
        <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {procedures.map((proc) => {
            const selected = selectedIds.includes(proc.id);
            const complexity = getComplexity(proc.step_count);
            return (
              <div
                key={proc.id}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-all ${
                  selected
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggle(proc.id)}
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    selected
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-slate-300 dark:border-slate-500'
                  }`}
                >
                  {selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityIcon(proc.title)}
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {proc.title}
                    </h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${complexity.color}`}>
                      {complexity.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {proc.description}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {t('tools.pdfFlowchart.pages')}: {proc.pages.join(', ')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      ~{proc.pages.length * 2} min
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => onViewProcedure(proc)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Eye className="h-3 w-3" />
                      {t('tools.pdfFlowchart.viewSection')}
                    </button>
                    <button
                      onClick={() => onReject(proc.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      <X className="h-3 w-3" />
                      {t('tools.pdfFlowchart.reject')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejected procedures */}
      {rejectedProcedures.length > 0 && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/10 dark:ring-red-800">
          <h4 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
            {t('tools.pdfFlowchart.rejectedTitle')}
          </h4>
          <div className="space-y-2">
            {rejectedProcedures.map((proc) => (
              <div key={proc.id} className="flex items-center justify-between text-sm">
                <span className="text-red-600 dark:text-red-400 truncate">{proc.title}</span>
                <button
                  onClick={() => onRestore(proc.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t('tools.pdfFlowchart.restore')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="btn-secondary">
          {t('tools.pdfFlowchart.back')}
        </button>
        <button
          onClick={() => onContinue(selectedIds)}
          disabled={selectedIds.length === 0}
          className="btn-primary"
        >
          {t('tools.pdfFlowchart.generateFlows')}
          <span className="text-xs opacity-80">({selectedIds.length})</span>
        </button>
      </div>
    </div>
  );
}
