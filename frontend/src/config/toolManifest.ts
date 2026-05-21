/**
 * Unified Tool Manifest — the single source of truth for every tool.
 *
 * Every consumer (App.tsx routes, HomePage grid, seoData, routes.ts, sitemap)
 * should derive its list from this manifest instead of maintaining a separate
 * hard-coded array.  This eliminates drift between route definitions, SEO
 * metadata, and homepage visibility.
 *
 * SAFETY RULE: Never remove an entry. New tools may only be appended.
 */

// ── Types ──────────────────────────────────────────────────────────
export type ToolCategory = 'pdf-core' | 'pdf-extended' | 'image' | 'conversion' | 'ai' | 'utility';

export interface ToolEntry {
  /** URL slug under /tools/ — also used as the unique key */
  slug: string;
  /** i18n key used in `tools.<key>.title` / `tools.<key>.shortDesc` */
  i18nKey: string;
  /** Lazy-import factory — returns the React component */
  component: () => Promise<{ default: React.ComponentType }>;
  /** Portfolio category */
  category: ToolCategory;
  /** Visible on homepage grid */
  homepage: boolean;
  /** Homepage section: 'pdf' tools section or 'other' tools section */
  homepageSection?: 'pdf' | 'other';
  /** Lucide icon name to render (used by HomePage) */
  iconName: string;
  /** Tailwind text-color class for the icon */
  iconColor: string;
  /** Tailwind bg-color class for the card */
  bgColor: string;
  /** Demand tier from portfolio analysis */
  demandTier: 'A' | 'B' | 'C';
}

// ── Manifest ───────────────────────────────────────────────────────
export const TOOL_MANIFEST: readonly ToolEntry[] = [
  // ─── PDF Core ──────────────────────────────────────────────────
  {
    slug: 'pdf-editor',
    i18nKey: 'pdfEditor',
    component: () => import('@/components/tools/PdfEditor'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'PenLine',
    iconColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
    demandTier: 'A',
  },
  {
    slug: 'pdf-to-word',
    i18nKey: 'pdfToWord',
    component: () => import('@/components/tools/PdfToWord'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'FileText',
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    demandTier: 'A',
  },
  {
    slug: 'word-to-pdf',
    i18nKey: 'wordToPdf',
    component: () => import('@/components/tools/WordToPdf'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'FileOutput',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    demandTier: 'A',
  },
  {
    slug: 'compress-pdf',
    i18nKey: 'compressPdf',
    component: () => import('@/components/tools/PdfCompressor'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Minimize2',
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    demandTier: 'A',
  },
  {
    slug: 'merge-pdf',
    i18nKey: 'mergePdf',
    component: () => import('@/components/tools/MergePdf'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Layers',
    iconColor: 'text-violet-600',
    bgColor: 'bg-violet-50',
    demandTier: 'A',
  },
  {
    slug: 'split-pdf',
    i18nKey: 'splitPdf',
    component: () => import('@/components/tools/SplitPdf'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Scissors',
    iconColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    demandTier: 'A',
  },
  {
    slug: 'rotate-pdf',
    i18nKey: 'rotatePdf',
    component: () => import('@/components/tools/RotatePdf'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'RotateCw',
    iconColor: 'text-teal-600',
    bgColor: 'bg-teal-50',
    demandTier: 'A',
  },
  {
    slug: 'pdf-to-images',
    i18nKey: 'pdfToImages',
    component: () => import('@/components/tools/PdfToImages'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Image',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    demandTier: 'A',
  },
  {
    slug: 'images-to-pdf',
    i18nKey: 'imagesToPdf',
    component: () => import('@/components/tools/ImagesToPdf'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'FileImage',
    iconColor: 'text-lime-600',
    bgColor: 'bg-lime-50',
    demandTier: 'A',
  },
  {
    slug: 'watermark-pdf',
    i18nKey: 'watermarkPdf',
    component: () => import('@/components/tools/WatermarkPdf'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Droplets',
    iconColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    demandTier: 'B',
  },
  {
    slug: 'protect-pdf',
    i18nKey: 'protectPdf',
    component: () => import('@/components/tools/ProtectPdf'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Lock',
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    demandTier: 'A',
  },
  {
    slug: 'unlock-pdf',
    i18nKey: 'unlockPdf',
    component: () => import('@/components/tools/UnlockPdf'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Unlock',
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    demandTier: 'A',
  },
  {
    slug: 'page-numbers',
    i18nKey: 'pageNumbers',
    component: () => import('@/components/tools/AddPageNumbers'),
    category: 'pdf-core',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'ListOrdered',
    iconColor: 'text-sky-600',
    bgColor: 'bg-sky-50',
    demandTier: 'B',
  },

  // ─── PDF Extended ──────────────────────────────────────────────
  {
    slug: 'pdf-flowchart',
    i18nKey: 'pdfFlowchart',
    component: () => import('@/components/tools/PdfFlowchart'),
    category: 'pdf-extended',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'GitBranch',
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    demandTier: 'C',
  },
  {
    slug: 'remove-watermark-pdf',
    i18nKey: 'removeWatermark',
    component: () => import('@/components/tools/RemoveWatermark'),
    category: 'pdf-extended',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Droplets',
    iconColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
    demandTier: 'B',
  },
  {
    slug: 'reorder-pdf',
    i18nKey: 'reorderPdf',
    component: () => import('@/components/tools/ReorderPdf'),
    category: 'pdf-extended',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'ArrowUpDown',
    iconColor: 'text-violet-600',
    bgColor: 'bg-violet-50',
    demandTier: 'B',
  },
  {
    slug: 'extract-pages',
    i18nKey: 'extractPages',
    component: () => import('@/components/tools/ExtractPages'),
    category: 'pdf-extended',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'FileOutput',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    demandTier: 'B',
  },
  {
    slug: 'sign-pdf',
    i18nKey: 'signPdf',
    component: () => import('@/components/tools/SignPdf'),
    category: 'pdf-extended',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'PenLine',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    demandTier: 'A',
  },
  {
    slug: 'crop-pdf',
    i18nKey: 'cropPdf',
    component: () => import('@/components/tools/CropPdf'),
    category: 'pdf-extended',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Crop',
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    demandTier: 'B',
  },
  {
    slug: 'flatten-pdf',
    i18nKey: 'flattenPdf',
    component: () => import('@/components/tools/FlattenPdf'),
    category: 'pdf-extended',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'FileDown',
    iconColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
    demandTier: 'B',
  },
  {
    slug: 'repair-pdf',
    i18nKey: 'repairPdf',
    component: () => import('@/components/tools/RepairPdf'),
    category: 'pdf-extended',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Wrench',
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    demandTier: 'B',
  },
  {
    slug: 'pdf-metadata',
    i18nKey: 'pdfMetadata',
    component: () => import('@/components/tools/PdfMetadata'),
    category: 'pdf-extended',
    homepage: false,
    homepageSection: 'pdf',
    iconName: 'FileText',
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    demandTier: 'C',
  },

  // ─── Image ─────────────────────────────────────────────────────
  {
    slug: 'image-converter',
    i18nKey: 'imageConvert',
    component: () => import('@/components/tools/ImageConverter'),
    category: 'image',
    homepage: true,
    homepageSection: 'other',
    iconName: 'ImageIcon',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    demandTier: 'B',
  },
  {
    slug: 'image-resize',
    i18nKey: 'imageResize',
    component: () => import('@/components/tools/ImageResize'),
    category: 'image',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Scaling',
    iconColor: 'text-teal-600',
    bgColor: 'bg-teal-50',
    demandTier: 'B',
  },
  {
    slug: 'compress-image',
    i18nKey: 'compressImage',
    component: () => import('@/components/tools/CompressImage'),
    category: 'image',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Minimize2',
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    demandTier: 'A',
  },
  {
    slug: 'ocr',
    i18nKey: 'ocr',
    component: () => import('@/components/tools/OcrTool'),
    category: 'image',
    homepage: true,
    homepageSection: 'other',
    iconName: 'ScanText',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    demandTier: 'A',
  },
  {
    slug: 'remove-background',
    i18nKey: 'removeBg',
    component: () => import('@/components/tools/RemoveBackground'),
    category: 'image',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Eraser',
    iconColor: 'text-fuchsia-600',
    bgColor: 'bg-fuchsia-50',
    demandTier: 'A',
  },
  {
    slug: 'image-to-svg',
    i18nKey: 'imageToSvg',
    component: () => import('@/components/tools/ImageToSvg'),
    category: 'image',
    homepage: true,
    homepageSection: 'other',
    iconName: 'ImageIcon',
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    demandTier: 'B',
  },
  {
    slug: 'image-crop',
    i18nKey: 'imageCrop',
    component: () => import('@/components/tools/ImageCrop'),
    category: 'image',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Crop',
    iconColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
    demandTier: 'C',
  },
  {
    slug: 'image-rotate-flip',
    i18nKey: 'imageRotateFlip',
    component: () => import('@/components/tools/ImageRotateFlip'),
    category: 'image',
    homepage: true,
    homepageSection: 'other',
    iconName: 'RotateCw',
    iconColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    demandTier: 'C',
  },

  // ─── Conversion ────────────────────────────────────────────────
  {
    slug: 'pdf-to-excel',
    i18nKey: 'pdfToExcel',
    component: () => import('@/components/tools/PdfToExcel'),
    category: 'conversion',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Sheet',
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    demandTier: 'A',
  },
  {
    slug: 'html-to-pdf',
    i18nKey: 'htmlToPdf',
    component: () => import('@/components/tools/HtmlToPdf'),
    category: 'conversion',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Code',
    iconColor: 'text-sky-600',
    bgColor: 'bg-sky-50',
    demandTier: 'B',
  },
  {
    slug: 'file-to-markdown',
    i18nKey: 'fileToMarkdown',
    component: () => import('@/components/tools/FileToMarkdown'),
    category: 'conversion',
    homepage: true,
    homepageSection: 'other',
    iconName: 'FileText',
    iconColor: 'text-sky-600',
    bgColor: 'bg-sky-50',
    demandTier: 'B',
  },
  {
    slug: 'pdf-to-pptx',
    i18nKey: 'pdfToPptx',
    component: () => import('@/components/tools/PdfToPptx'),
    category: 'conversion',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Presentation',
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    demandTier: 'B',
  },
  {
    slug: 'excel-to-pdf',
    i18nKey: 'excelToPdf',
    component: () => import('@/components/tools/ExcelToPdf'),
    category: 'conversion',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Sheet',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    demandTier: 'B',
  },
  {
    slug: 'pptx-to-pdf',
    i18nKey: 'pptxToPdf',
    component: () => import('@/components/tools/PptxToPdf'),
    category: 'conversion',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Presentation',
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50',
    demandTier: 'B',
  },

  // ─── AI ────────────────────────────────────────────────────────
  {
    slug: 'chat-pdf',
    i18nKey: 'chatPdf',
    component: () => import('@/components/tools/ChatPdf'),
    category: 'ai',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'MessageSquare',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    demandTier: 'B',
  },
  {
    slug: 'summarize-pdf',
    i18nKey: 'summarizePdf',
    component: () => import('@/components/tools/SummarizePdf'),
    category: 'ai',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'FileText',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    demandTier: 'A',
  },
  {
    slug: 'translate-pdf',
    i18nKey: 'translatePdf',
    component: () => import('@/components/tools/TranslatePdf'),
    category: 'ai',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Languages',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    demandTier: 'A',
  },
  {
    slug: 'extract-tables',
    i18nKey: 'tableExtractor',
    component: () => import('@/components/tools/TableExtractor'),
    category: 'ai',
    homepage: true,
    homepageSection: 'pdf',
    iconName: 'Table',
    iconColor: 'text-teal-600',
    bgColor: 'bg-teal-50',
    demandTier: 'B',
  },

  // ─── Utility ───────────────────────────────────────────────────
  {
    slug: 'qr-code',
    i18nKey: 'qrCode',
    component: () => import('@/components/tools/QrCodeGenerator'),
    category: 'utility',
    homepage: true,
    homepageSection: 'other',
    iconName: 'QrCode',
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    demandTier: 'B',
  },
  {
    slug: 'barcode-generator',
    i18nKey: 'barcode',
    component: () => import('@/components/tools/BarcodeGenerator'),
    category: 'utility',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Barcode',
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    demandTier: 'B',
  },
  {
    slug: 'video-to-gif',
    i18nKey: 'videoToGif',
    component: () => import('@/components/tools/VideoToGif'),
    category: 'utility',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Film',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    demandTier: 'B',
  },
  {
    slug: 'word-counter',
    i18nKey: 'wordCounter',
    component: () => import('@/components/tools/WordCounter'),
    category: 'utility',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Hash',
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    demandTier: 'C',
  },
  {
    slug: 'text-cleaner',
    i18nKey: 'textCleaner',
    component: () => import('@/components/tools/TextCleaner'),
    category: 'utility',
    homepage: true,
    homepageSection: 'other',
    iconName: 'Eraser',
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    demandTier: 'C',
  },
] as const;

// ── Derived helpers ────────────────────────────────────────────────

/** All tool slugs — usable by routes.ts, sitemap, etc. */
export function getManifestSlugs(): string[] {
  return TOOL_MANIFEST.map((t) => t.slug);
}

/** Tools visible on the homepage, split by section */
export function getHomepageTools(section: 'pdf' | 'other'): readonly ToolEntry[] {
  return TOOL_MANIFEST.filter((t) => t.homepage && t.homepageSection === section);
}

/** Tools grouped by portfolio category */
export function getToolsByCategory(category: ToolCategory): readonly ToolEntry[] {
  return TOOL_MANIFEST.filter((t) => t.category === category);
}

/** Lookup a single tool by slug */
export function getToolEntry(slug: string): ToolEntry | undefined {
  return TOOL_MANIFEST.find((t) => t.slug === slug);
}

/** All tool route paths — for the route registry */
export function getManifestRoutePaths(): string[] {
  return TOOL_MANIFEST.map((t) => `/tools/${t.slug}`);
}
