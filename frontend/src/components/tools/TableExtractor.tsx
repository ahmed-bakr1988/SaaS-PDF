import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Table } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';
import { useFileStore } from '@/stores/fileStore';

interface ExtractedTable {
  page: number;
  table_index: number;
  headers: string[];
  rows: string[][];
}

export default function TableExtractor() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');
  const [tables, setTables] = useState<ExtractedTable[]>([]);

  const {
    file, uploadProgress, isUploading, taskId,
    error: uploadError, selectFile, startUpload, reset,
  } = useFileUpload({
    endpoint: '/pdf-ai/extract-tables',
    maxSizeMB: 20,
    acceptedTypes: ['pdf'],
  });

  const { status, result, error: taskError } = useTaskPolling({
    taskId,
    onComplete: (r) => {
      setPhase('done');
      const raw = (r as Record<string, unknown>).tables;
      if (Array.isArray(raw)) setTables(raw as ExtractedTable[]);
    },
    onError: () => setPhase('done'),
  });

  const storeFile = useFileStore((s) => s.file);
  const clearStoreFile = useFileStore((s) => s.clearFile);
  useEffect(() => {
    if (storeFile) { selectFile(storeFile); clearStoreFile(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async () => {
    const id = await startUpload();
    if (id) setPhase('processing');
  };

  const handleReset = () => { reset(); setPhase('upload'); setTables([]); };

  const schema = generateToolSchema({
    name: t('tools.tableExtractor.title'),
    description: t('tools.tableExtractor.description'),
    url: `${window.location.origin}/tools/extract-tables`,
  });

  return (
    <>
      <Helmet>
        <title>{t('tools.tableExtractor.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.tableExtractor.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/extract-tables`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-900/30">
            <Table className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="section-heading">{t('tools.tableExtractor.title')}</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{t('tools.tableExtractor.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {phase === 'upload' && (
          <div className="space-y-4">
            <FileUploader
              onFileSelect={selectFile} file={file}
              accept={{ 'application/pdf': ['.pdf'] }}
              maxSizeMB={20} isUploading={isUploading}
              uploadProgress={uploadProgress} error={uploadError}
              onReset={handleReset} acceptLabel="PDF (.pdf)"
            />
            {file && !isUploading && (
              <button onClick={handleUpload} className="btn-primary w-full">
                {t('tools.tableExtractor.shortDesc')}
              </button>
            )}
          </div>
        )}

        {phase === 'processing' && !result && (
          <ProgressBar state={status?.state || 'PENDING'} message={status?.progress} />
        )}

        {phase === 'done' && tables.length > 0 && (
          <div className="space-y-6">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              {t('tools.tableExtractor.tablesFound', { count: tables.length })}
            </p>
            {tables.map((tbl, idx) => (
              <div key={idx} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {t('tools.tableExtractor.tablePage', { page: tbl.page, index: tbl.table_index + 1 })}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    {tbl.headers.length > 0 && (
                      <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                          {tbl.headers.map((h, hi) => (
                            <th key={hi} className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">{h}</th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {tbl.rows.map((row, ri) => (
                        <tr key={ri} className="border-t border-slate-100 dark:border-slate-700">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2 text-slate-600 dark:text-slate-300">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}

        {phase === 'done' && result && tables.length === 0 && !taskError && (
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">{t('tools.tableExtractor.noTables')}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}

        {phase === 'done' && taskError && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{taskError}</p>
            </div>
            <button onClick={handleReset} className="btn-secondary w-full">{t('common.startOver')}</button>
          </div>
        )}

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}
