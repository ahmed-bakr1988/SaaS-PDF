/**
 * Component Registry & System
 * Central registry of all UI components with metadata and styling
 */

import { LucideIcon } from 'lucide-react';

/**
 * Component Type Definitions
 */
export interface ComponentMetadata {
  name: string;
  description: string;
  category: 'button' | 'input' | 'card' | 'layout' | 'overlay' | 'feedback' | 'navigation' | 'form';
  variants?: string[];
  props?: Record<string, unknown>;
  a11y?: {
    role?: string;
    ariaLabel?: string;
    ariaDescribedBy?: string;
  };
}

export interface ComponentColors {
  light: {
    bg: string;
    text: string;
    border: string;
    hover?: string;
  };
  dark: {
    bg: string;
    text: string;
    border: string;
    hover?: string;
  };
}

export interface ToolCardMetadata {
  name: string;
  slug: string;
  icon: string; // Lucide icon name
  category: 'pdf' | 'image' | 'video' | 'document' | 'text' | 'convert' | 'edit' | 'secure';
  colorBg: string; // Tailwind bg class
  colorIcon: string; // Tailwind text color class
  description: string;
  i18nKey: string;
  isPremium?: boolean;
  isNew?: boolean;
  isPopular?: boolean;
  orderPriority: number; // 1 = highest priority on homepage
}

/**
 * UI Component Registry
 */
export const componentRegistry: Record<string, ComponentMetadata> = {
  // Buttons
  button: {
    name: 'Button',
    description: 'Primary interactive element',
    category: 'button',
    variants: ['primary', 'secondary', 'success', 'danger', 'ghost', 'icon'],
  },
  buttonPrimary: {
    name: 'Primary Button',
    description: 'Main call-to-action button',
    category: 'button',
    a11y: { role: 'button' },
  },
  buttonSecondary: {
    name: 'Secondary Button',
    description: 'Alternative action button',
    category: 'button',
  },
  buttonIcon: {
    name: 'Icon Button',
    description: 'Icon-only interactive button',
    category: 'button',
    a11y: { role: 'button', ariaLabel: 'Required for icon buttons' },
  },

  // Inputs & Forms
  input: {
    name: 'Text Input',
    description: 'Single-line text input field',
    category: 'input',
  },
  inputFile: {
    name: 'File Input',
    description: 'File upload field',
    category: 'input',
  },
  fileUploader: {
    name: 'File Uploader',
    description: 'Drag-and-drop file upload zone',
    category: 'input',
  },
  formSelect: {
    name: 'Select Dropdown',
    description: 'Option selection dropdown',
    category: 'form',
  },
  formCheckbox: {
    name: 'Checkbox',
    description: 'Multi-select checkbox input',
    category: 'form',
  },
  formRadio: {
    name: 'Radio Button',
    description: 'Single-select radio input',
    category: 'form',
  },
  formToggle: {
    name: 'Toggle Switch',
    description: 'On/off toggle switch',
    category: 'form',
  },

  // Cards & Containers
  card: {
    name: 'Card',
    description: 'Elevation container with padding',
    category: 'card',
  },
  toolCard: {
    name: 'Tool Card',
    description: 'Tool preview card for homepage grid',
    category: 'card',
  },
  pricingCard: {
    name: 'Pricing Card',
    description: 'Subscription plan card',
    category: 'card',
  },

  // Layout
  header: {
    name: 'Header',
    description: 'Application header with navigation',
    category: 'layout',
  },
  footer: {
    name: 'Footer',
    description: 'Application footer',
    category: 'layout',
  },
  sidebar: {
    name: 'Sidebar',
    description: 'Side navigation panel',
    category: 'layout',
  },
  container: {
    name: 'Container',
    description: 'Max-width wrapper',
    category: 'layout',
  },

  // Feedback
  alert: {
    name: 'Alert',
    description: 'Alert message container',
    category: 'feedback',
    variants: ['success', 'warning', 'error', 'info'],
  },
  badge: {
    name: 'Badge',
    description: 'Small labeling component',
    category: 'feedback',
  },
  progressBar: {
    name: 'Progress Bar',
    description: 'Linear progress indicator',
    category: 'feedback',
  },
  spinner: {
    name: 'Spinner',
    description: 'Loading spinner indicator',
    category: 'feedback',
  },
  toast: {
    name: 'Toast',
    description: 'Temporary notification message',
    category: 'feedback',
  },

  // Overlay & Navigation
  modal: {
    name: 'Modal Dialog',
    description: 'Modal dialog overlay',
    category: 'overlay',
  },
  dropdown: {
    name: 'Dropdown Menu',
    description: 'Dropdown menu with options',
    category: 'navigation',
  },
  tabs: {
    name: 'Tabs',
    description: 'Tabbed content navigation',
    category: 'navigation',
  },
  breadcrumb: {
    name: 'Breadcrumb',
    description: 'Breadcrumb navigation trail',
    category: 'navigation',
  },
  pagination: {
    name: 'Pagination',
    description: 'Page navigation controls',
    category: 'navigation',
  },
};

/**
 * Tool Categories with Colors
 */
export const toolCategories = {
  pdf: {
    name: 'PDF Tools',
    color: 'red-600',
    bgLight: 'bg-red-50',
    bgDark: 'dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  image: {
    name: 'Image Tools',
    color: 'amber-600',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  video: {
    name: 'Video Tools',
    color: 'cyan-600',
    bgLight: 'bg-cyan-50',
    bgDark: 'dark:bg-cyan-900/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
  },
  document: {
    name: 'Document Tools',
    color: 'blue-600',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  text: {
    name: 'Text Tools',
    color: 'violet-600',
    bgLight: 'bg-violet-50',
    bgDark: 'dark:bg-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800',
  },
  convert: {
    name: 'Conversion Tools',
    color: 'pink-600',
    bgLight: 'bg-pink-50',
    bgDark: 'dark:bg-pink-900/20',
    borderColor: 'border-pink-200 dark:border-pink-800',
  },
  edit: {
    name: 'Editing Tools',
    color: 'emerald-600',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  secure: {
    name: 'Security Tools',
    color: 'orange-600',
    bgLight: 'bg-orange-50',
    bgDark: 'dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
} as const;

/**
 * Complete Tool Registry
 * This should be updated to include ALL 40+ tools
 */
export const toolRegistry: Record<string, ToolCardMetadata> = {
  pdfCompressor: {
    name: 'Compress PDF',
    slug: 'compress-pdf',
    icon: 'Minimize2',
    category: 'pdf',
    colorBg: 'bg-red-50 dark:bg-red-900/20',
    colorIcon: 'text-red-600 dark:text-red-400',
    description: 'Reduce PDF file size without losing quality',
    i18nKey: 'tools.compressPdf.title',
    isPopular: true,
    orderPriority: 1,
  },
  pdfToWord: {
    name: 'PDF to Word',
    slug: 'pdf-to-word',
    icon: 'FileText',
    category: 'convert',
    colorBg: 'bg-pink-50 dark:bg-pink-900/20',
    colorIcon: 'text-pink-600 dark:text-pink-400',
    description: 'Convert PDF documents to editable Word files',
    i18nKey: 'tools.pdfToWord.title',
    isPopular: true,
    orderPriority: 2,
  },
  wordToPdf: {
    name: 'Word to PDF',
    slug: 'word-to-pdf',
    icon: 'FilePdf',
    category: 'convert',
    colorBg: 'bg-blue-50 dark:bg-blue-900/20',
    colorIcon: 'text-blue-600 dark:text-blue-400',
    description: 'Convert Word documents to PDF format',
    i18nKey: 'tools.wordToPdf.title',
    isPopular: true,
    orderPriority: 3,
  },
  mergePdf: {
    name: 'Merge PDF',
    slug: 'merge-pdf',
    icon: 'Layers',
    category: 'pdf',
    colorBg: 'bg-violet-50 dark:bg-violet-900/20',
    colorIcon: 'text-violet-600 dark:text-violet-400',
    description: 'Combine multiple PDF files into one',
    i18nKey: 'tools.mergePdf.title',
    isPopular: true,
    orderPriority: 4,
  },
  splitPdf: {
    name: 'Split PDF',
    slug: 'split-pdf',
    icon: 'Scissors',
    category: 'pdf',
    colorBg: 'bg-pink-50 dark:bg-pink-900/20',
    colorIcon: 'text-pink-600 dark:text-pink-400',
    description: 'Extract pages or split PDF into separate files',
    i18nKey: 'tools.splitPdf.title',
    orderPriority: 5,
  },
  rotatePdf: {
    name: 'Rotate PDF',
    slug: 'rotate-pdf',
    icon: 'RotateCw',
    category: 'edit',
    colorBg: 'bg-teal-50 dark:bg-teal-900/20',
    colorIcon: 'text-teal-600 dark:text-teal-400',
    description: 'Rotate PDF pages at any angle',
    i18nKey: 'tools.rotatePdf.title',
    orderPriority: 6,
  },
  pdfToImages: {
    name: 'PDF to Images',
    slug: 'pdf-to-images',
    icon: 'Image',
    category: 'convert',
    colorBg: 'bg-amber-50 dark:bg-amber-900/20',
    colorIcon: 'text-amber-600 dark:text-amber-400',
    description: 'Convert PDF pages to individual image files',
    i18nKey: 'tools.pdfToImages.title',
    orderPriority: 7,
  },
  imagesToPdf: {
    name: 'Images to PDF',
    slug: 'images-to-pdf',
    icon: 'FileImage',
    category: 'convert',
    colorBg: 'bg-lime-50 dark:bg-lime-900/20',
    colorIcon: 'text-lime-600 dark:text-lime-400',
    description: 'Combine images into a single PDF file',
    i18nKey: 'tools.imagesToPdf.title',
    orderPriority: 8,
  },
  watermarkPdf: {
    name: 'Watermark PDF',
    slug: 'watermark-pdf',
    icon: 'Droplets',
    category: 'edit',
    colorBg: 'bg-cyan-50 dark:bg-cyan-900/20',
    colorIcon: 'text-cyan-600 dark:text-cyan-400',
    description: 'Add watermarks to PDF documents',
    i18nKey: 'tools.watermarkPdf.title',
    orderPriority: 9,
  },
  protectPdf: {
    name: 'Protect PDF',
    slug: 'protect-pdf',
    icon: 'Lock',
    category: 'secure',
    colorBg: 'bg-red-50 dark:bg-red-900/20',
    colorIcon: 'text-red-600 dark:text-red-400',
    description: 'Password-protect PDF files',
    i18nKey: 'tools.protectPdf.title',
    isPremium: true,
    orderPriority: 10,
  },
  unlockPdf: {
    name: 'Unlock PDF',
    slug: 'unlock-pdf',
    icon: 'Unlock',
    category: 'secure',
    colorBg: 'bg-green-50 dark:bg-green-900/20',
    colorIcon: 'text-green-600 dark:text-green-400',
    description: 'Remove password protection from PDF files',
    i18nKey: 'tools.unlockPdf.title',
    isPremium: true,
    orderPriority: 11,
  },
  addPageNumbers: {
    name: 'Add Page Numbers',
    slug: 'add-page-numbers',
    icon: 'ListOrdered',
    category: 'edit',
    colorBg: 'bg-sky-50 dark:bg-sky-900/20',
    colorIcon: 'text-sky-600 dark:text-sky-400',
    description: 'Add page numbers to PDF documents',
    i18nKey: 'tools.addPageNumbers.title',
    isPremium: true,
    orderPriority: 12,
  },
  imageConverter: {
    name: 'Image Converter',
    slug: 'image-converter',
    icon: 'ImageIcon',
    category: 'image',
    colorBg: 'bg-purple-50 dark:bg-purple-900/20',
    colorIcon: 'text-purple-600 dark:text-purple-400',
    description: 'Convert images between different formats',
    i18nKey: 'tools.imageConverter.title',
    orderPriority: 13,
  },
  videoToGif: {
    name: 'Video to GIF',
    slug: 'video-to-gif',
    icon: 'Film',
    category: 'video',
    colorBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    colorIcon: 'text-emerald-600 dark:text-emerald-400',
    description: 'Convert video files to animated GIFs',
    i18nKey: 'tools.videoToGif.title',
    isPremium: true,
    orderPriority: 14,
  },
  wordCounter: {
    name: 'Word Counter',
    slug: 'word-counter',
    icon: 'Hash',
    category: 'text',
    colorBg: 'bg-blue-50 dark:bg-blue-900/20',
    colorIcon: 'text-blue-600 dark:text-blue-400',
    description: 'Count words, characters, and paragraphs',
    i18nKey: 'tools.wordCounter.title',
    orderPriority: 15,
  },
  textCleaner: {
    name: 'Text Cleaner',
    slug: 'text-cleaner',
    icon: 'Eraser',
    category: 'text',
    colorBg: 'bg-indigo-50 dark:bg-indigo-900/20',
    colorIcon: 'text-indigo-600 dark:text-indigo-400',
    description: 'Clean and format text content',
    i18nKey: 'tools.textCleaner.title',
    orderPriority: 16,
  },
};

/**
 * Get all tools sorted by priority
 */
export function getToolsByPriority(): ToolCardMetadata[] {
  return Object.values(toolRegistry).sort(
    (a, b) => a.orderPriority - b.orderPriority
  );
}

/**
 * Get tools by category
 */
export function getToolsByCategory(
  category: ToolCardMetadata['category']
): ToolCardMetadata[] {
  return Object.values(toolRegistry)
    .filter((tool) => tool.category === category)
    .sort((a, b) => a.orderPriority - b.orderPriority);
}

/**
 * Get popular tools
 */
export function getPopularTools(): ToolCardMetadata[] {
  return Object.values(toolRegistry)
    .filter((tool) => tool.isPopular)
    .sort((a, b) => a.orderPriority - b.orderPriority);
}

/**
 * Get premium tools
 */
export function getPremiumTools(): ToolCardMetadata[] {
  return Object.values(toolRegistry).filter((tool) => tool.isPremium);
}

export default {
  componentRegistry,
  toolRegistry,
  toolCategories,
  getToolsByPriority,
  getToolsByCategory,
  getPopularTools,
  getPremiumTools,
};
