import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Target, Check, AlertTriangle } from 'lucide-react';
import type { Procedure, PDFPage } from './types';

interface ManualProcedureProps {
  pages: PDFPage[];
  onProcedureCreated: (proc: Procedure) => void;
  onBack: () => void;
}

export default function ManualProcedure({ pages, onProcedureCreated, onBack }: ManualProcedureProps) {
  const { t } = useTranslation();
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const maxPages = pages.length || 1;
  const isValidRange = startPage >= 1 && endPage >= startPage && endPage <= maxPages;
  const selectedPages = isValidRange
    ? Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
    : [];
  const canCreate = title.trim() && description.trim() && selectedPages.length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    onProcedureCreated({
      id: `manual-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      pages: selectedPages,
      step_count: selectedPages.length * 3,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left — form */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <div className="mb-5 flex items-center gap-3">
          <button onClick={onBack} className="btn-secondary text-xs">
            <ArrowLeft className="h-4 w-4" />
            {t('tools.pdfFlowchart.back')}
          </button>
          <div>
            <h2 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
              <Target className="h-5 w-5" />
              {t('tools.pdfFlowchart.manualTitle')}
            </h2>
            <p className="text-xs text-slate-500">{t('tools.pdfFlowchart.manualDesc')}</p>
          </div>
        </div>

        {/* Document info */}
        <div className="mb-5 rounded-xl bg-indigo-50 p-3 ring-1 ring-indigo-200 dark:bg-indigo-900/20 dark:ring-indigo-800">
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
            {t('tools.pdfFlowchart.totalPagesLabel')}: {maxPages}
          </p>
        </div>

        {/* Page range */}
        <div className="mb-5">
          <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t('tools.pdfFlowchart.selectPageRange')}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('tools.pdfFlowchart.startPage')}</label>
              <input
                type="number"
                min={1}
                max={maxPages}
                value={startPage}
                onChange={(e) => setStartPage(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">{t('tools.pdfFlowchart.endPage')}</label>
              <input
                type="number"
                min={1}
                max={maxPages}
                value={endPage}
                onChange={(e) => setEndPage(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
              />
            </div>
          </div>
          {!isValidRange && startPage > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
              <AlertTriangle className="h-3 w-3" />
              {t('tools.pdfFlowchart.invalidRange')}
            </p>
          )}
          {isValidRange && selectedPages.length > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              {selectedPages.length} {t('tools.pdfFlowchart.pagesSelected')}
            </p>
          )}
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            {t('tools.pdfFlowchart.procTitle')}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('tools.pdfFlowchart.procTitlePlaceholder')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
          />
        </div>

        {/* Description */}
        <div className="mb-5">
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            {t('tools.pdfFlowchart.procDescription')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={t('tools.pdfFlowchart.procDescPlaceholder')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
          />
        </div>

        <button disabled={!canCreate} onClick={handleCreate} className="btn-primary w-full">
          <Check className="h-4 w-4" />
          {t('tools.pdfFlowchart.createProcedure')}
        </button>
      </div>

      {/* Right — page preview */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t('tools.pdfFlowchart.pagePreview')}
        </h3>
        <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
          {selectedPages.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              {t('tools.pdfFlowchart.selectPagesToPreview')}
            </p>
          ) : (
            selectedPages.map((pn) => {
              const pageData = pages.find((p) => p.page === pn);
              return (
                <div key={pn} className="rounded-xl border-l-4 border-l-indigo-400 bg-slate-50 p-3 dark:bg-slate-700/50">
                  <p className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {t('tools.pdfFlowchart.pageLabel')} {pn}
                  </p>
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-sans">
                    {pageData?.text || t('tools.pdfFlowchart.noPageContent')}
                  </pre>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
