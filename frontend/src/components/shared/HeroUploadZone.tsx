import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, Sparkles, PenLine } from 'lucide-react';
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
          className={`hero-upload-zone ${isDragActive ? 'drag-active' : ''}`}
        >
          <input {...getInputProps()} />

          {/* Icon */}
          <div
            className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
              isDragActive
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'bg-primary-50 dark:bg-primary-900/20'
            }`}
          >
            <Upload
              className={`h-8 w-8 transition-colors ${
                isDragActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-primary-500 dark:text-primary-400'
              }`}
            />
          </div>

          {/* CTA Text */}
          <div className="mb-6 flex gap-3 justify-center z-10 relative">
            <button
              type="button"
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors"
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
               className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <PenLine className="h-5 w-5" />
              {t('home.editNow')}
            </button>
          </div>

          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            {t('common.dragDrop', 'or drop files here')}
          </p>

          {/* Supported formats */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {['PDF', 'Word', 'JPG', 'PNG', 'WebP', 'MP4'].map((format) => (
              <span
                key={format}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                {format}
              </span>
            ))}
          </div>

          {/* File size hint */}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Sparkles className="h-3.5 w-3.5" />
            {t('home.uploadSubtitle')}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 ring-1 ring-red-200 dark:bg-red-900/20 dark:ring-red-800">
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
