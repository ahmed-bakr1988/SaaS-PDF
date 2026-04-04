import { useState, useCallback, lazy, Suspense } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UploadCloud, PenLine, ChevronRight, FileCheck } from 'lucide-react';
import { useFileStore } from '@/stores/fileStore';
import type { ToolOption } from '@/utils/fileRouting';
import { useConfig } from '@/hooks/useConfig';

const ToolSelectorModal = lazy(() => import('@/components/shared/ToolSelectorModal'));

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

const FORMAT_BADGES = [
  { label: 'PDF', color: 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800/40' },
  { label: 'Word', color: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800/40' },
  { label: 'JPG', color: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800/40' },
  { label: 'PNG', color: 'bg-green-50 text-green-700 ring-green-100 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-800/40' },
  { label: 'WebP', color: 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:ring-violet-800/40' },
  { label: 'MP4', color: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600' },
];

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
    async (acceptedFiles: File[]) => {
      setError(null);

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const { getToolsForFile, detectFileCategory, getCategoryLabel } = await import('@/utils/fileRouting');
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

  const iconGlowClass = isDragActive
    ? 'bg-primary-300/50 scale-125'
    : 'bg-primary-100/0 group-hover:bg-primary-200/40 group-hover:scale-110';
  const iconContainerClass = isDragActive
    ? 'bg-primary-100 shadow-primary-200 dark:bg-primary-900/50'
    : 'bg-primary-50 shadow-sm dark:bg-slate-700/80';
  const uploadIconClass = isDragActive
    ? 'text-primary-600 dark:text-primary-400'
    : 'text-primary-400 group-hover:text-primary-600 dark:text-primary-500 dark:group-hover:text-primary-400';

  return (
    <>
      <div className="mx-auto mt-8 max-w-2xl">
        <div
          {...getRootProps()}
          className={`hero-upload-zone group ${isDragActive ? 'drag-active' : ''}`}
        >
          <input {...getInputProps()} aria-label={t('home.dragDropTitle', 'Drag & drop your file here')} />

          {/* Cloud icon with animated ring */}
          <div className="relative mb-6">
            {/* Outer glow ring */}
            <div className={`absolute inset-0 rounded-3xl blur-xl transition-all duration-500 ${iconGlowClass}`} />
            <div className={`relative flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-lg ${iconContainerClass}`}>
              <UploadCloud className={`h-10 w-10 transition-colors duration-300 ${uploadIconClass}`} />
            </div>
          </div>

          {/* Heading */}
          <h3 className="mb-2 text-xl font-bold text-slate-800 dark:text-slate-100">
            {isDragActive
              ? t('home.dropFileHere', 'Drop your file here…')
              : t('home.dragDropTitle', 'Drag & drop your file here')}
          </h3>
          <p className="mb-7 text-sm text-slate-500 dark:text-slate-400">
            {t('common.dragDrop', 'or click the button to browse from your device')}
          </p>

          {/* CTA Buttons */}
          <div className="relative z-10 mb-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-7 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 transition-all duration-200 hover:bg-primary-700 hover:shadow-lg hover:-translate-y-px active:translate-y-0 dark:shadow-primary-900/40"
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
              <FileCheck className="h-4 w-4" />
              {t('home.uploadCta', 'Choose File')}
            </button>
            <button
              type="button"
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md hover:-translate-y-px active:translate-y-0 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
            >
              <PenLine className="h-4 w-4" />
              {t('home.editNow')}
            </button>
          </div>

          {/* Divider */}
          <div className="mb-5 flex items-center gap-3 w-full max-w-xs">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {t('home.supportedFormats', 'Supported formats')}
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Coloured format badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {FORMAT_BADGES.map(({ label, color }) => (
              <span
                key={label}
                className={`rounded-lg px-3 py-1 text-xs font-semibold ring-1 ${color}`}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Size hint */}
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <ChevronRight className="h-3 w-3" />
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
      <Suspense fallback={null}>
        <ToolSelectorModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          file={selectedFile}
          tools={matchedTools}
          fileTypeLabel={fileTypeLabel}
        />
      </Suspense>
    </>
  );
}
