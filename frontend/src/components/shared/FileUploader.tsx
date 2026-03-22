import { useState, useCallback } from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { Upload, File, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatFileSize } from '@/utils/textTools';

interface FileUploaderProps {
  /** Called when a file is selected/dropped */
  onFileSelect: (file: File) => void;
  /** Currently selected file */
  file: File | null;
  /** Accepted MIME types */
  accept?: Accept;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Whether upload is in progress */
  isUploading?: boolean;
  /** Upload progress percentage */
  uploadProgress?: number;
  /** Error message */
  error?: string | null;
  /** Reset handler */
  onReset?: () => void;
  /** Descriptive text for accepted file types */
  acceptLabel?: string;
}

export default function FileUploader({
  onFileSelect,
  file,
  accept,
  maxSizeMB = 20,
  isUploading = false,
  uploadProgress = 0,
  error,
  onReset,
  acceptLabel,
}: FileUploaderProps) {
  const { t } = useTranslation();
  const [sizeError, setSizeError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setSizeError(null);
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const onDropRejected = useCallback(
    (rejectedFiles: FileRejection[]) => {
      const code = rejectedFiles[0]?.errors[0]?.code;
      if (code === 'file-too-large') {
        const msg = t('common.errors.fileTooLarge', { size: maxSizeMB });
        setSizeError(msg);
        toast.error(msg);
      }
    },
    [maxSizeMB, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept,
    maxFiles: 1,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled: isUploading,
  });

  return (
    <div className="w-full">
      {/* Drop Zone */}
      {!file && (
        <div
          {...getRootProps()}
          className={`upload-zone ${isDragActive ? 'drag-active' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload
            className={`mb-4 h-12 w-12 ${
              isDragActive ? 'text-primary-500' : 'text-slate-400'
            }`}
          />
          <p className="mb-2 text-base font-medium text-slate-700 dark:text-slate-300">
            {t('common.dragDrop')}
          </p>
          {acceptLabel && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{acceptLabel}</p>
          )}
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {t('common.maxSize', { size: maxSizeMB })}
          </p>
        </div>
      )}

      {/* Selected File */}
      {file && !isUploading && (
        <div className="flex items-center gap-3 rounded-xl bg-primary-50 p-4 ring-1 ring-primary-200 dark:bg-primary-900/20 dark:ring-primary-800">
          <File className="h-8 w-8 flex-shrink-0 text-primary-600 dark:text-primary-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {file.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</p>
          </div>
          {onReset && (
            <button
              onClick={onReset}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              aria-label="Remove file"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('common.upload')}...
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {(sizeError || error) && (
        <div className="mt-3 rounded-xl bg-red-50 p-3 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">⚠️ {sizeError || error}</p>
        </div>
      )}
    </div>
  );
}
