import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, File as FileIcon } from 'lucide-react';
import { useFileStore } from '@/stores/fileStore';
import { formatFileSize } from '@/utils/textTools';
import type { ToolOption } from '@/utils/fileRouting';

interface ToolSelectorModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The uploaded file */
  file: File | null;
  /** Available tools for this file type */
  tools: ToolOption[];
  /** Detected file type label (e.g. "PDF", "Image") */
  fileTypeLabel: string;
}

export default function ToolSelectorModal({
  isOpen,
  onClose,
  file,
  tools,
  fileTypeLabel,
}: ToolSelectorModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setStoreFile = useFileStore((s) => s.setFile);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleToolSelect = useCallback(
    (tool: ToolOption) => {
      if (!file) return;

      // Store file in zustand for the target tool to pick up
      setStoreFile(file);

      // Navigate to the tool page
      navigate(tool.path);
      onClose();
    },
    [file, setStoreFile, navigate, onClose]
  );

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!isOpen || !file) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tool-selector-title"
    >
      <div className="modal-content flex w-full max-w-lg max-h-[90vh] flex-col rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2
              id="tool-selector-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              {t('home.selectTool')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('home.fileDetected', { type: fileTypeLabel })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File Info */}
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-primary-50 p-3 ring-1 ring-primary-200 dark:bg-primary-900/20 dark:ring-primary-800">
          <FileIcon className="h-8 w-8 flex-shrink-0 text-primary-600 dark:text-primary-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {file.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.key}
                  onClick={() => handleToolSelect(tool)}
                  className="group flex flex-col items-center gap-2 rounded-xl p-4 ring-1 ring-slate-200 transition-all hover:ring-primary-300 hover:shadow-md dark:ring-slate-700 dark:hover:ring-primary-600"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.bgColor}`}
                  >
                    <Icon className={`h-5 w-5 ${tool.iconColor}`} />
                  </div>
                  <span className="text-center text-xs font-medium text-slate-700 group-hover:text-primary-600 dark:text-slate-300 dark:group-hover:text-primary-400">
                    {t(`tools.${tool.key}.shortDesc`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
