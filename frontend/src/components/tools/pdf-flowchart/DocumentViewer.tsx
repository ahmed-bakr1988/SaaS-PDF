import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText, AlertTriangle, BookOpen } from 'lucide-react';
import type { Procedure, PDFPage } from './types';

interface DocumentViewerProps {
  procedure: Procedure;
  pages: PDFPage[];
  onClose: () => void;
}

export default function DocumentViewer({ procedure, pages, onClose }: DocumentViewerProps) {
  const { t } = useTranslation();

  const relevantPages = pages.filter((p) => procedure.pages.includes(p.page));

  const isHighPriority =
    /emergency|safety|طوارئ|أمان|urgence/i.test(procedure.title);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <button onClick={onClose} className="btn-secondary text-xs">
          <ArrowLeft className="h-4 w-4" />
          {t('tools.pdfFlowchart.backToProcedures')}
        </button>
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-200">
            <BookOpen className="h-5 w-5" />
            {t('tools.pdfFlowchart.documentViewer')}
          </h2>
        </div>
      </div>

      {/* Procedure info card */}
      <div className={`mb-5 rounded-xl p-4 ring-1 ${isHighPriority ? 'bg-red-50 ring-red-200 dark:bg-red-900/10 dark:ring-red-800' : 'bg-blue-50 ring-blue-200 dark:bg-blue-900/10 dark:ring-blue-800'}`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isHighPriority ? 'bg-red-100' : 'bg-blue-100'}`}>
            {isHighPriority ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <FileText className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${isHighPriority ? 'text-red-900 dark:text-red-300' : 'text-blue-900 dark:text-blue-300'}`}>
              {procedure.title}
            </h3>
            <p className={`mt-1 text-sm ${isHighPriority ? 'text-red-800 dark:text-red-400' : 'text-blue-800 dark:text-blue-400'}`}>
              {procedure.description}
            </p>
            <div className={`mt-2 flex gap-4 text-xs ${isHighPriority ? 'text-red-700' : 'text-blue-700'}`}>
              <span>{t('tools.pdfFlowchart.pages')}: {procedure.pages.join(', ')}</span>
              <span>{t('tools.pdfFlowchart.totalPagesLabel')}: {procedure.pages.length}</span>
              <span>~{procedure.pages.length * 2} min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pages content */}
      <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
        <h4 className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
          <FileText className="h-4 w-4" />
          {t('tools.pdfFlowchart.documentContent')} ({relevantPages.length} {t('tools.pdfFlowchart.pagesWord')})
        </h4>

        {relevantPages.length === 0 ? (
          <p className="py-8 text-center text-slate-500">{t('tools.pdfFlowchart.noPageContent')}</p>
        ) : (
          relevantPages.map((page) => (
            <div
              key={page.page}
              className="rounded-xl border-l-4 border-l-primary-400 bg-slate-50 p-4 dark:bg-slate-700/50"
            >
              <div className="mb-2 flex items-center justify-between">
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('tools.pdfFlowchart.pageLabel')} {page.page}
                  {page.title ? `: ${page.title}` : ''}
                </h5>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-600 dark:text-slate-300">
                  {t('tools.pdfFlowchart.pageLabel')} {page.page}
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-sans">
                {page.text}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* AI Analysis summary */}
      <div className="mt-5 rounded-xl bg-green-50 p-4 ring-1 ring-green-200 dark:bg-green-900/10 dark:ring-green-800">
        <h4 className="mb-2 font-semibold text-green-900 dark:text-green-300">
          {t('tools.pdfFlowchart.aiAnalysis')}
        </h4>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="font-medium text-green-800 dark:text-green-400">{t('tools.pdfFlowchart.keyActions')}</p>
            <p className="text-green-700 dark:text-green-500">
              {procedure.step_count} {t('tools.pdfFlowchart.stepsIdentified')}
            </p>
          </div>
          <div>
            <p className="font-medium text-green-800 dark:text-green-400">{t('tools.pdfFlowchart.decisionPoints')}</p>
            <p className="text-green-700 dark:text-green-500">
              {Math.max(1, Math.floor(procedure.step_count / 3))} {t('tools.pdfFlowchart.estimated')}
            </p>
          </div>
          <div>
            <p className="font-medium text-green-800 dark:text-green-400">{t('tools.pdfFlowchart.flowComplexity')}</p>
            <p className="text-green-700 dark:text-green-500">
              {procedure.step_count <= 4
                ? t('tools.pdfFlowchart.complexity.simple')
                : procedure.step_count <= 8
                  ? t('tools.pdfFlowchart.complexity.medium')
                  : t('tools.pdfFlowchart.complexity.complex')}
            </p>
          </div>
        </div>
      </div>

      {/* Back row */}
      <div className="mt-5 flex justify-between items-center border-t border-slate-200 pt-4 dark:border-slate-700">
        <button onClick={onClose} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" />
          {t('tools.pdfFlowchart.backToProcedures')}
        </button>
        <p className="text-xs text-slate-400">
          ~{procedure.step_count <= 4 ? '6-8' : procedure.step_count <= 8 ? '8-12' : '12-16'} {t('tools.pdfFlowchart.flowStepsEstimate')}
        </p>
      </div>
    </div>
  );
}
