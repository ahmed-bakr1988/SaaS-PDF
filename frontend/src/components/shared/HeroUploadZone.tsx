import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UploadCloud, Sparkles, PenLine } from 'lucide-react';
import ToolSelectorModal from '@/components/shared/ToolSelectorModal';
import { useFileStore } from '@/stores/fileStore';
import { getToolsForFile, detectFileCategory, getCategoryLabel } from '@/utils/fileRouting';
import type { ToolOption } from '@/utils/fileRouting';
import { useConfig } from '@/hooks/useConfig';

/**
 * The MIME types we accept on the homepage smart upload zone.
 * Covers PDF, images, video, and Word documents.
 */
const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export default function HeroUploadZone() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setStoreFile = useFileStore((s) => s.setFile);
  const { limits } = useConfig();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [matchedTools, setMatchedTools] = useState<ToolOption[]>([]);
  const [fileTypeLabel, setFileTypeLabel] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const tools = getToolsForFile(file);

      if (tools.length === 0) {
        setError(t('home.unsupportedFile'));
        return;
      }

      const category = detectFileCategory(file);
      const label = getCategoryLabel(category);

      setSelectedFile(file);
      setMatchedTools(tools);
      setFileTypeLabel(label);
      setModalOpen(true);
    },
    [t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize: limits.homepageSmartUpload * 1024 * 1024,
    onDropRejected: (rejections) => {
      const rejection = rejections[0];
      if (rejection?.errors[0]?.code === 'file-too-large') {
        setError(t('common.maxSize', { size: limits.homepageSmartUpload }));
      } else {
        setError(t('home.unsupportedFile'));
      }
    },
  });

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedFile(null);
    setMatchedTools([]);
  }, []);

  return (
    <>
      <div className="mx-auto mt-8 max-w-2xl">
        <div
          {...getRootProps()}
          className={`hero-upload-zone group ${isDragActive ? 'drag-active' : ''}`}
        >
          <input {...getInputProps()} />

          {/* Animated icon */}
          <div
            className={`mb-5 flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm transition-all duration-300 group-hover:-translate-y-2 ${
              isDragActive
                ? 'bg-primary-100 shadow-glow dark:bg-primary-900/40'
                : 'bg-white dark:bg-slate-700/60'
            }`}
          >
            <UploadCloud
              className={`h-10 w-10 transition-colors duration-300 ${
                isDragActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-400 group-hover:text-primary-500 dark:text-slate-400 dark:group-hover:text-primary-400'
              }`}
            />
          </div>

          {/* Heading */}
          <h3 className="mb-1.5 text-lg font-semibold text-slate-800 dark:text-slate-100">
            {isDragActive
              ? t('home.dropFileHere', 'Drop your file here…')
              : t('home.dragDropTitle', 'Drag & drop your file here')}
          </h3>
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
            {t('common.dragDrop', 'or click the button to browse from your device')}
          </p>

          {/* CTA Buttons */}
          <div className="mb-5 flex gap-3 justify-center z-10 relative flex-wrap">
            <button
              type="button"
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = Object.values(ACCEPTED_TYPES).flat().join(',');
                input.onchange = (ev) => {
                  const fileInput = ev.target as HTMLInputElement;
                  const f = fileInput.files?.[0];
                  if (f) onDrop([f]);
                };
                input.click();
              }}
            >
              {t('home.uploadCta', 'Choose File')}
            </button>
            <button
               onClick={(e) => {
                 e.stopPropagation();
                 const input = document.createElement('input');
                 input.type = 'file';
                 input.accept = '.pdf';
                 input.onchange = (ev) => {
                   const fileInput = ev.target as HTMLInputElement;
                   const f = fileInput.files?.[0];
                   if (f) {
                     setStoreFile(f);
                     navigate('/tools/pdf-editor');
                   }
                 };
                 input.click();
               }}
               className="px-6 py-2.5 bg-slate-900 hover:bg-slate-700 active:scale-95 text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              <PenLine className="h-4 w-4" />
              {t('home.editNow')}
            </button>
          </div>

          {/* Supported formats */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['PDF', 'Word', 'JPG', 'PNG', 'WebP', 'MP4'].map((format) => (
              <span
                key={format}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                {format}
              </span>
            ))}
          </div>

          {/* File size hint */}
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Sparkles className="h-3.5 w-3.5" />
            {t('home.uploadSubtitle')}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-2xl bg-red-50 p-3 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
            <p className="text-center text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Tool Selector Modal */}
      <ToolSelectorModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        file={selectedFile}
        tools={matchedTools}
        fileTypeLabel={fileTypeLabel}
      />
    </>
  );
}
