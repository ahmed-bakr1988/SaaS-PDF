import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, CheckCircle, Zap, X } from 'lucide-react';

interface FlowUploadProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onClearFile: () => void;
  onUpload: () => void;
  onTrySample: () => void;
  uploading: boolean;
  error: string | null;
}

export default function FlowUpload({
  file,
  onFileSelect,
  onClearFile,
  onUpload,
  onTrySample,
  uploading,
  error,
}: FlowUploadProps) {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const f = e.dataTransfer.files[0];
      if (f?.type === 'application/pdf') onFileSelect(f);
    },
    [onFileSelect],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f?.type === 'application/pdf') onFileSelect(f);
  };

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      {/* Try Sample banner */}
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-indigo-50 p-4 ring-1 ring-indigo-200 dark:bg-indigo-900/20 dark:ring-indigo-800">
        <Zap className="h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
            {t('tools.pdfFlowchart.trySampleTitle')}
          </p>
          <p className="text-xs text-indigo-700 dark:text-indigo-400">
            {t('tools.pdfFlowchart.trySampleDesc')}
          </p>
        </div>
        <button onClick={onTrySample} className="btn-secondary text-xs whitespace-nowrap">
          <FileText className="h-3.5 w-3.5" />
          {t('tools.pdfFlowchart.trySample')}
        </button>
      </div>

      {/* Drag & Drop zone */}
      <label
        htmlFor="flowchart-upload"
        className={`upload-zone flex w-full cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-10 text-center transition-all ${
          dragActive
            ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
            : 'border-slate-300 hover:border-primary-300 dark:border-slate-600 dark:hover:border-primary-500'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <Upload
          className={`mb-3 h-10 w-10 transition-colors ${
            dragActive ? 'text-primary-500' : 'text-slate-400'
          }`}
        />
        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {t('tools.pdfFlowchart.uploadStep')}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {t('tools.pdfFlowchart.dragDropHint')}
        </p>
        <input
          id="flowchart-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleInputChange}
        />
      </label>

      {/* Selected file */}
      {file && (
        <div className="mt-4 flex w-full items-center gap-3 rounded-xl bg-green-50 px-4 py-3 ring-1 ring-green-200 dark:bg-green-900/20 dark:ring-green-800">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 truncate">
              {file.name}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            onClick={onClearFile}
            className="rounded-lg p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-800/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 rounded-xl bg-red-50 p-3 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
          <p className="text-center text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={onUpload}
        disabled={!file || uploading}
        className="btn-primary mt-6 w-full"
      >
        {uploading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {t('tools.pdfFlowchart.extracting')}
          </>
        ) : (
          <>
            <Upload className="h-5 w-5" />
            {t('tools.pdfFlowchart.generateFlows')}
          </>
        )}
      </button>
    </div>
  );
}
