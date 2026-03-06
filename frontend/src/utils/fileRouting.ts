import {
  FileText,
  FileOutput,
  Minimize2,
  Layers,
  Scissors,
  RotateCw,
  Image,
  FileImage,
  Droplets,
  Lock,
  Unlock,
  ListOrdered,
  ImageIcon,
  Film,
  PenLine,
  GitBranch,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

export interface ToolOption {
  /** i18n key inside tools.{key} */
  key: string;
  /** Route path */
  path: string;
  /** Lucide icon component */
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  /** Tailwind bg color class for the icon container */
  bgColor: string;
  /** Tailwind text color class for the icon */
  iconColor: string;
}

/** PDF tools available when a .pdf file is uploaded */
const pdfTools: ToolOption[] = [
  { key: 'compressPdf', path: '/tools/compress-pdf', icon: Minimize2, bgColor: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
  { key: 'mergePdf', path: '/tools/merge-pdf', icon: Layers, bgColor: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400' },
  { key: 'splitPdf', path: '/tools/split-pdf', icon: Scissors, bgColor: 'bg-pink-100 dark:bg-pink-900/30', iconColor: 'text-pink-600 dark:text-pink-400' },
  { key: 'rotatePdf', path: '/tools/rotate-pdf', icon: RotateCw, bgColor: 'bg-teal-100 dark:bg-teal-900/30', iconColor: 'text-teal-600 dark:text-teal-400' },
  { key: 'pdfToWord', path: '/tools/pdf-to-word', icon: FileText, bgColor: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  { key: 'pdfToImages', path: '/tools/pdf-to-images', icon: Image, bgColor: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600 dark:text-amber-400' },
  { key: 'watermarkPdf', path: '/tools/watermark-pdf', icon: Droplets, bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
  { key: 'protectPdf', path: '/tools/protect-pdf', icon: Lock, bgColor: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400' },
  { key: 'unlockPdf', path: '/tools/unlock-pdf', icon: Unlock, bgColor: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
  { key: 'pageNumbers', path: '/tools/page-numbers', icon: ListOrdered, bgColor: 'bg-sky-100 dark:bg-sky-900/30', iconColor: 'text-sky-600 dark:text-sky-400' },
  { key: 'pdfEditor', path: '/tools/pdf-editor', icon: PenLine, bgColor: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600 dark:text-rose-400' },
  { key: 'pdfFlowchart', path: '/tools/pdf-flowchart', icon: GitBranch, bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
];

/** Image tools available when an image is uploaded */
const imageTools: ToolOption[] = [
  { key: 'imageConvert', path: '/tools/image-converter', icon: ImageIcon, bgColor: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
  { key: 'imagesToPdf', path: '/tools/images-to-pdf', icon: FileImage, bgColor: 'bg-lime-100 dark:bg-lime-900/30', iconColor: 'text-lime-600 dark:text-lime-400' },
];

/** Video tools available when a video is uploaded */
const videoTools: ToolOption[] = [
  { key: 'videoToGif', path: '/tools/video-to-gif', icon: Film, bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
];

/** Word document tools */
const wordTools: ToolOption[] = [
  { key: 'wordToPdf', path: '/tools/word-to-pdf', icon: FileOutput, bgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
];

/** File type category labels for i18n */
export type FileCategory = 'pdf' | 'image' | 'video' | 'word' | 'unknown';

/**
 * Detect the category of a file based on its extension and MIME type.
 */
export function detectFileCategory(file: File): FileCategory {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = file.type.toLowerCase();

  // PDF
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';

  // Images
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext) || mime.startsWith('image/')) return 'image';

  // Video
  if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext) || mime.startsWith('video/')) return 'video';

  // Word documents
  if (['doc', 'docx'].includes(ext) || mime.includes('word') || mime.includes('document')) return 'word';

  return 'unknown';
}

/**
 * Get the list of available tools for a given file.
 * Returns an empty array if the file type is unsupported.
 */
export function getToolsForFile(file: File): ToolOption[] {
  const category = detectFileCategory(file);

  switch (category) {
    case 'pdf':
      return pdfTools;
    case 'image':
      return imageTools;
    case 'video':
      return videoTools;
    case 'word':
      return wordTools;
    default:
      return [];
  }
}

/**
 * Map file category to i18n label key (home.fileType.*)
 */
export function getCategoryLabel(category: FileCategory): string {
  const labels: Record<FileCategory, string> = {
    pdf: 'PDF',
    image: 'home.fileTypes.image',
    video: 'home.fileTypes.video',
    word: 'Word',
    unknown: 'home.fileTypes.unknown',
  };
  return labels[category];
}
