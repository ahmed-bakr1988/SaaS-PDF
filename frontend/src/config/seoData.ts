/**
 * Central SEO configuration for all tools.
 * Single source of truth for meta, FAQ schema, related tools, and landing page content.
 */

export interface ToolFAQ {
  question: string;
  answer: string;
}

export interface ToolSEO {
  /** i18n key (matches tools.xxx in en.json) */
  i18nKey: string;
  /** URL slug under /tools/ */
  slug: string;
  /** SEO-optimized page title suffix (after tool name) */
  titleSuffix: string;
  /** Full meta description for search engines */
  metaDescription: string;
  /** Category for structured data */
  category: 'PDF' | 'Image' | 'AI' | 'Convert' | 'Utility';
  /** Slugs of related tools for internal linking */
  relatedSlugs: string[];
  /** FAQ items for FAQPage schema */
  faqs: ToolFAQ[];
  /** Short feature bullets for the landing page */
  features: string[];
  /** Keywords for meta tag */
  keywords: string;
}

export const TOOLS_SEO: ToolSEO[] = [
  // ─── PDF TOOLS ──────────────────────────────────────────────
  {
    i18nKey: 'pdfToWord',
    slug: 'pdf-to-word',
    titleSuffix: 'Free Online PDF to Word Converter',
    metaDescription: 'Convert PDF to Word documents online for free. No signup required. Preserve formatting and layout with our fast PDF to DOCX converter.',
    category: 'PDF',
    relatedSlugs: ['word-to-pdf', 'pdf-to-excel', 'compress-pdf', 'merge-pdf'],
    keywords: 'pdf to word, pdf to docx, convert pdf to word, pdf converter, free pdf to word',
    features: [
      'Convert PDF to editable Word documents instantly',
      'Preserve original formatting and layout',
      'No signup or installation required',
      'Process files securely — auto-deleted after 30 minutes',
      'Supports large PDF files up to 20MB',
    ],
    faqs: [
      { question: 'How do I convert a PDF to Word?', answer: 'Simply upload your PDF file to our converter, and it will automatically convert it to an editable Word document (DOCX format). Click download when the conversion is complete.' },
      { question: 'Is this PDF to Word converter free?', answer: 'Yes, our PDF to Word converter is completely free to use with no hidden costs or signup required.' },
      { question: 'Will my PDF formatting be preserved?', answer: 'Our converter preserves the original formatting, fonts, and layout of your PDF as closely as possible in the Word output.' },
      { question: 'Is my file secure?', answer: 'Yes. All uploaded files are automatically deleted from our servers within 30 minutes. We never share or store your documents.' },
      { question: 'What is the maximum file size?', answer: 'You can upload PDF files up to 20MB for conversion.' },
    ],
  },
  {
    i18nKey: 'wordToPdf',
    slug: 'word-to-pdf',
    titleSuffix: 'Free Online Word to PDF Converter',
    metaDescription: 'Convert Word documents to PDF online for free. DOC and DOCX to PDF with perfect formatting. No signup required.',
    category: 'Convert',
    relatedSlugs: ['pdf-to-word', 'html-to-pdf', 'compress-pdf', 'merge-pdf'],
    keywords: 'word to pdf, docx to pdf, doc to pdf, convert word to pdf, free word to pdf converter',
    features: [
      'Convert DOC and DOCX files to PDF instantly',
      'Perfect formatting preservation',
      'Free with no registration needed',
      'Secure processing — files auto-deleted',
      'Works on any device with a browser',
    ],
    faqs: [
      { question: 'How do I convert Word to PDF?', answer: 'Upload your Word file (.doc or .docx), and our converter will instantly create a high-quality PDF while preserving all formatting.' },
      { question: 'Is the Word to PDF converter free?', answer: 'Yes, it is completely free with no limits on the number of conversions.' },
      { question: 'Can I convert DOC files, not just DOCX?', answer: 'Yes, both older DOC format and modern DOCX format are fully supported.' },
      { question: 'Will images in my Word document be included?', answer: 'Yes, all images, tables, and graphical elements in your Word document will be faithfully reproduced in the PDF.' },
    ],
  },
  {
    i18nKey: 'compressPdf',
    slug: 'compress-pdf',
    titleSuffix: 'Free Online PDF Compressor — Reduce File Size',
    metaDescription: 'Compress PDF files online for free. Reduce PDF size by up to 90% while maintaining quality. Fast and secure PDF compression.',
    category: 'PDF',
    relatedSlugs: ['merge-pdf', 'split-pdf', 'pdf-to-word', 'compress-image'],
    keywords: 'compress pdf, reduce pdf size, pdf compressor, shrink pdf, make pdf smaller',
    features: [
      'Reduce PDF file size by up to 90%',
      'Choose your compression level (low, medium, high)',
      'Maintain text quality and readability',
      'Free with no file count limits',
      'Process files securely on our servers',
    ],
    faqs: [
      { question: 'How does PDF compression work?', answer: 'Our tool optimizes images, removes unnecessary metadata, and compresses internal structures to reduce file size while maintaining visual quality.' },
      { question: 'Will compression affect text quality?', answer: 'No. Text remains crisp and searchable. Mainly images within the PDF are optimized to reduce file size.' },
      { question: 'How much can I reduce my PDF size?', answer: 'Depending on the content, you can typically reduce file size by 50-90%, especially for PDFs with many images.' },
      { question: 'Is there a file size limit?', answer: 'You can compress PDFs up to 20MB in size.' },
    ],
  },
  {
    i18nKey: 'mergePdf',
    slug: 'merge-pdf',
    titleSuffix: 'Free Online PDF Merger — Combine PDF Files',
    metaDescription: 'Merge multiple PDF files into one document online for free. Combine PDFs quickly and securely with no signup required.',
    category: 'PDF',
    relatedSlugs: ['split-pdf', 'compress-pdf', 'reorder-pdf', 'page-numbers'],
    keywords: 'merge pdf, combine pdf, join pdf, pdf merger, merge pdf files online free',
    features: [
      'Combine multiple PDF files into a single document',
      'Drag and drop to reorder files before merging',
      'No limit on the number of files',
      'Maintains original formatting and quality',
      'Fast processing with secure file handling',
    ],
    faqs: [
      { question: 'How do I merge PDF files?', answer: 'Upload two or more PDF files, arrange them in the desired order, and click merge. Your combined PDF will be ready to download instantly.' },
      { question: 'Is there a limit on how many PDFs I can merge?', answer: 'No, you can merge as many PDF files as you need in a single operation.' },
      { question: 'Will the merged PDF maintain quality?', answer: 'Yes, merging is a lossless operation — all pages retain their original quality and formatting.' },
      { question: 'Can I rearrange pages before merging?', answer: 'Yes, you can drag and drop to reorder the files before combining them.' },
    ],
  },
  {
    i18nKey: 'splitPdf',
    slug: 'split-pdf',
    titleSuffix: 'Free Online PDF Splitter — Extract Pages',
    metaDescription: 'Split PDF files into individual pages or extract specific page ranges online for free. Fast, secure, and no signup needed.',
    category: 'PDF',
    relatedSlugs: ['merge-pdf', 'extract-pages', 'rotate-pdf', 'reorder-pdf'],
    keywords: 'split pdf, pdf splitter, extract pages from pdf, separate pdf pages, divide pdf',
    features: [
      'Split a PDF into individual pages',
      'Extract specific page ranges',
      'Fast and completely free',
      'No software installation required',
      'Secure — files deleted after processing',
    ],
    faqs: [
      { question: 'How do I split a PDF?', answer: 'Upload your PDF, specify the pages or ranges you want to extract, and click split. Download the resulting PDF instantly.' },
      { question: 'Can I extract specific pages?', answer: 'Yes, you can specify individual pages (e.g., 1, 3, 5) or ranges (e.g., 1-5) to extract.' },
      { question: 'Is splitting a PDF free?', answer: 'Yes, our PDF splitter is completely free with no limitations.' },
    ],
  },
  {
    i18nKey: 'rotatePdf',
    slug: 'rotate-pdf',
    titleSuffix: 'Free Online PDF Rotator',
    metaDescription: 'Rotate PDF pages by 90°, 180° or 270° online for free. Fix page orientation quickly with no software needed.',
    category: 'PDF',
    relatedSlugs: ['merge-pdf', 'split-pdf', 'reorder-pdf', 'compress-pdf'],
    keywords: 'rotate pdf, rotate pdf pages, pdf rotator, turn pdf pages, flip pdf',
    features: [
      'Rotate all pages by 90°, 180°, or 270°',
      'Fix scanned documents with wrong orientation',
      'Instant processing',
      'Free and no signup needed',
    ],
    faqs: [
      { question: 'How do I rotate a PDF?', answer: 'Upload your PDF, choose the rotation angle (90°, 180°, or 270°), and download the rotated file.' },
      { question: 'Can I rotate specific pages?', answer: 'Currently, the tool rotates all pages by the same angle. For selective rotation, split the PDF first.' },
    ],
  },
  {
    i18nKey: 'pdfToImages',
    slug: 'pdf-to-images',
    titleSuffix: 'Free Online PDF to Image Converter',
    metaDescription: 'Convert PDF pages to high-quality images (PNG or JPG) online for free. Extract each page as a separate image file.',
    category: 'PDF',
    relatedSlugs: ['images-to-pdf', 'pdf-to-word', 'compress-image', 'image-converter'],
    keywords: 'pdf to image, pdf to png, pdf to jpg, convert pdf to image, extract images from pdf',
    features: [
      'Convert each PDF page to a high-quality image',
      'Choose PNG or JPG output format',
      'Process multi-page PDFs automatically',
      'Free with no registration',
    ],
    faqs: [
      { question: 'How do I convert a PDF to images?', answer: 'Upload your PDF and each page will be converted to a high-quality image. Download the images individually or as a ZIP file.' },
      { question: 'What image formats are supported?', answer: 'You can convert PDF pages to PNG or JPG format.' },
    ],
  },
  {
    i18nKey: 'imagesToPdf',
    slug: 'images-to-pdf',
    titleSuffix: 'Free Online Images to PDF Converter',
    metaDescription: 'Combine multiple images into a single PDF document online for free. Supports JPG, PNG, and WebP formats.',
    category: 'PDF',
    relatedSlugs: ['pdf-to-images', 'merge-pdf', 'compress-image', 'image-resize'],
    keywords: 'images to pdf, jpg to pdf, png to pdf, combine images to pdf, photo to pdf',
    features: [
      'Combine multiple images into one PDF',
      'Supports JPG, PNG, and WebP formats',
      'Arrange image order before converting',
      'Free and no account required',
    ],
    faqs: [
      { question: 'How do I convert images to PDF?', answer: 'Upload your images (JPG, PNG, or WebP), arrange them in the desired order, and click convert. Your combined PDF will be ready to download.' },
      { question: 'How many images can I combine?', answer: 'You can combine as many images as needed into a single PDF document.' },
    ],
  },
  {
    i18nKey: 'watermarkPdf',
    slug: 'watermark-pdf',
    titleSuffix: 'Free Online PDF Watermark Tool',
    metaDescription: 'Add custom text watermarks to your PDF documents online for free. Protect your documents with branded watermarks.',
    category: 'PDF',
    relatedSlugs: ['remove-watermark-pdf', 'protect-pdf', 'compress-pdf', 'merge-pdf'],
    keywords: 'watermark pdf, add watermark to pdf, pdf watermark, stamp pdf, brand pdf',
    features: [
      'Add custom text watermarks to every page',
      'Customize font size, color, and opacity',
      'Prevent unauthorized use of your documents',
      'Free with no installation needed',
    ],
    faqs: [
      { question: 'How do I add a watermark to a PDF?', answer: 'Upload your PDF, enter your watermark text, customize the appearance, and download the watermarked file.' },
      { question: 'Can I customize the watermark appearance?', answer: 'Yes, you can adjust the text, size, color, opacity, and rotation angle of the watermark.' },
    ],
  },
  {
    i18nKey: 'removeWatermark',
    slug: 'remove-watermark-pdf',
    titleSuffix: 'Free Online PDF Watermark Remover',
    metaDescription: 'Remove text watermarks from PDF files online for free. Clean up your PDFs by removing unwanted watermark text.',
    category: 'PDF',
    relatedSlugs: ['watermark-pdf', 'compress-pdf', 'pdf-to-word', 'pdf-editor'],
    keywords: 'remove watermark pdf, delete watermark, pdf watermark remover, clean pdf',
    features: [
      'Remove text watermarks from PDF pages',
      'Automatic watermark detection',
      'Preserves document content and layout',
      'Free and secure',
    ],
    faqs: [
      { question: 'Can this tool remove any watermark?', answer: 'Our tool works best with text-based watermarks. Image-based or embedded watermarks may require additional processing.' },
      { question: 'Will removing the watermark affect document quality?', answer: 'No, only the watermark text is removed. All other content remains intact.' },
    ],
  },
  {
    i18nKey: 'protectPdf',
    slug: 'protect-pdf',
    titleSuffix: 'Free Online PDF Password Protector',
    metaDescription: 'Add password protection to your PDF files online for free. Secure your documents with encryption to prevent unauthorized access.',
    category: 'PDF',
    relatedSlugs: ['unlock-pdf', 'watermark-pdf', 'compress-pdf', 'merge-pdf'],
    keywords: 'protect pdf, password protect pdf, encrypt pdf, secure pdf, lock pdf',
    features: [
      'Add password protection to any PDF',
      'Prevent unauthorized access',
      'Strong encryption for sensitive documents',
      'Free and no signup required',
    ],
    faqs: [
      { question: 'How do I password-protect a PDF?', answer: 'Upload your PDF, set a password, and download the encrypted file. Only people with the password can open it.' },
      { question: 'How secure is the encryption?', answer: 'We use industry-standard PDF encryption to protect your documents.' },
    ],
  },
  {
    i18nKey: 'unlockPdf',
    slug: 'unlock-pdf',
    titleSuffix: 'Free Online PDF Unlocker',
    metaDescription: 'Remove password protection from PDF files online for free. Unlock your PDFs to edit, print, or copy content.',
    category: 'PDF',
    relatedSlugs: ['protect-pdf', 'compress-pdf', 'pdf-to-word', 'merge-pdf'],
    keywords: 'unlock pdf, remove pdf password, pdf unlocker, decrypt pdf, open locked pdf',
    features: [
      'Remove password protection from PDFs',
      'Unlock PDFs for editing, printing, and copying',
      'Fast and free',
      'Secure processing',
    ],
    faqs: [
      { question: 'How do I unlock a PDF?', answer: 'Upload your protected PDF, enter the current password, and download the unlocked version.' },
      { question: 'Can I unlock a PDF without the password?', answer: 'No, you need to know the current password to unlock it. This is by design for security.' },
    ],
  },
  {
    i18nKey: 'pageNumbers',
    slug: 'page-numbers',
    titleSuffix: 'Free Online PDF Page Number Tool',
    metaDescription: 'Add page numbers to your PDF documents online for free. Choose position, starting number, and format.',
    category: 'PDF',
    relatedSlugs: ['merge-pdf', 'reorder-pdf', 'watermark-pdf', 'compress-pdf'],
    keywords: 'add page numbers to pdf, pdf page numbers, number pdf pages, pdf page numbering',
    features: [
      'Add page numbers to every page',
      'Choose header or footer position',
      'Set custom starting number',
      'Free and no installation needed',
    ],
    faqs: [
      { question: 'How do I add page numbers to a PDF?', answer: 'Upload your PDF, choose the position (top or bottom, left/center/right), set the starting number, and download.' },
      { question: 'Can I start numbering from a specific page?', answer: 'Yes, you can set the starting page number to any value.' },
    ],
  },
  {
    i18nKey: 'reorderPdf',
    slug: 'reorder-pdf',
    titleSuffix: 'Free Online PDF Page Reorder Tool',
    metaDescription: 'Rearrange pages in your PDF document online for free. Drag and drop to reorder pages in any sequence.',
    category: 'PDF',
    relatedSlugs: ['merge-pdf', 'split-pdf', 'extract-pages', 'rotate-pdf'],
    keywords: 'reorder pdf pages, rearrange pdf, sort pdf pages, move pdf pages, organize pdf',
    features: [
      'Drag-and-drop page reordering',
      'Visual page thumbnails for easy arrangement',
      'Free with no registration',
      'Process any PDF document',
    ],
    faqs: [
      { question: 'How do I reorder PDF pages?', answer: 'Upload your PDF, then drag and drop page thumbnails to arrange them in your desired order. Click save to download the reordered PDF.' },
      { question: 'Can I delete pages while reordering?', answer: 'For deleting pages, use our Extract Pages tool which lets you select specific pages to keep.' },
    ],
  },
  {
    i18nKey: 'extractPages',
    slug: 'extract-pages',
    titleSuffix: 'Free Online PDF Page Extractor',
    metaDescription: 'Extract specific pages from a PDF into a new document online for free. Select the exact pages you need.',
    category: 'PDF',
    relatedSlugs: ['split-pdf', 'merge-pdf', 'reorder-pdf', 'compress-pdf'],
    keywords: 'extract pdf pages, pdf page extractor, select pages from pdf, copy pdf pages',
    features: [
      'Extract specific pages from any PDF',
      'Select individual pages or ranges',
      'Create a new PDF with only the pages you need',
      'Free and completely secure',
    ],
    faqs: [
      { question: 'How do I extract pages from a PDF?', answer: 'Upload your PDF, select the pages you want (e.g., 1, 3, 5-10), and download the new PDF containing only those pages.' },
      { question: 'What is the difference between Split and Extract?', answer: 'Split divides a PDF at a specific point, while Extract lets you pick any combination of pages.' },
    ],
  },
  {
    i18nKey: 'pdfEditor',
    slug: 'pdf-editor',
    titleSuffix: 'Free Online PDF Editor & Optimizer',
    metaDescription: 'Edit and optimize PDF documents online for free. Add text annotations and create optimized copies of your PDFs.',
    category: 'PDF',
    relatedSlugs: ['compress-pdf', 'pdf-to-word', 'watermark-pdf', 'merge-pdf'],
    keywords: 'pdf editor, edit pdf online, pdf optimizer, modify pdf, annotate pdf',
    features: [
      'Add text annotations to PDF pages',
      'Optimize PDF file structure',
      'Free online PDF editing',
      'No software download required',
    ],
    faqs: [
      { question: 'Can I edit text in a PDF?', answer: 'You can add text annotations and overlays to your PDF. For full text editing, convert to Word first using our PDF to Word tool.' },
      { question: 'Is the PDF editor free?', answer: 'Yes, our online PDF editor is completely free to use.' },
    ],
  },
  {
    i18nKey: 'pdfFlowchart',
    slug: 'pdf-flowchart',
    titleSuffix: 'Free Online PDF to Flowchart Converter',
    metaDescription: 'Convert PDF procedures into interactive flowcharts automatically using AI. Visualize processes and workflows from PDF documents.',
    category: 'AI',
    relatedSlugs: ['summarize-pdf', 'chat-pdf', 'pdf-to-word', 'extract-tables'],
    keywords: 'pdf to flowchart, process flowchart, workflow diagram, visualize pdf, ai flowchart',
    features: [
      'AI-powered procedure extraction',
      'Interactive flowchart visualization',
      'Export flowcharts as images',
      'Edit and customize generated flowcharts',
    ],
    faqs: [
      { question: 'How does PDF to Flowchart work?', answer: 'Upload a PDF with procedures or workflows, and our AI analyzes the content to generate an interactive flowchart with decision points and process steps.' },
      { question: 'What types of PDFs work best?', answer: 'PDFs containing step-by-step procedures, SOPs, workflows, and process documentation produce the best results.' },
    ],
  },

  // ─── IMAGE TOOLS ────────────────────────────────────────────
  {
    i18nKey: 'imageConvert',
    slug: 'image-converter',
    titleSuffix: 'Free Online Image Format Converter',
    metaDescription: 'Convert images between JPG, PNG, and WebP formats instantly online for free. Fast, secure image conversion with no quality loss.',
    category: 'Image',
    relatedSlugs: ['compress-image', 'image-resize', 'remove-background', 'images-to-pdf'],
    keywords: 'image converter, jpg to png, png to jpg, webp to jpg, convert image format',
    features: [
      'Convert between JPG, PNG, and WebP',
      'No quality loss during conversion',
      'Instant processing',
      'Batch conversion support',
    ],
    faqs: [
      { question: 'What image formats are supported?', answer: 'You can convert between JPG, PNG, and WebP formats.' },
      { question: 'Does conversion reduce image quality?', answer: 'No, our converter maintains the original image quality during format conversion.' },
    ],
  },
  {
    i18nKey: 'imageResize',
    slug: 'image-resize',
    titleSuffix: 'Free Online Image Resizer',
    metaDescription: 'Resize images to exact dimensions online for free. Maintain aspect ratio or set custom width and height. Supports JPG, PNG, WebP.',
    category: 'Image',
    relatedSlugs: ['compress-image', 'image-converter', 'remove-background', 'images-to-pdf'],
    keywords: 'resize image, image resizer, change image size, scale image, reduce image dimensions',
    features: [
      'Resize to exact pixel dimensions',
      'Maintain or override aspect ratio',
      'Choose output format (JPG, PNG, WebP)',
      'Free with no file limits',
    ],
    faqs: [
      { question: 'How do I resize an image?', answer: 'Upload your image, enter the desired width and height (or use percentage), and download the resized image.' },
      { question: 'Can I maintain the aspect ratio?', answer: 'Yes, you can lock the aspect ratio so the image resizes proportionally.' },
    ],
  },
  {
    i18nKey: 'compressImage',
    slug: 'compress-image',
    titleSuffix: 'Free Online Image Compressor',
    metaDescription: 'Compress images online for free. Reduce image file size while maintaining quality. Supports PNG, JPG, and WebP formats.',
    category: 'Image',
    relatedSlugs: ['compress-pdf', 'image-resize', 'image-converter', 'remove-background'],
    keywords: 'compress image, reduce image size, image compressor, optimize image, shrink image',
    features: [
      'Reduce image file size significantly',
      'Maintain visual quality',
      'Supports PNG, JPG, and WebP',
      'Choose compression level',
    ],
    faqs: [
      { question: 'How does image compression work?', answer: 'Our tool reduces the file size of your image by optimizing encoding and removing unnecessary metadata while preserving visual quality.' },
      { question: 'Which format compresses best?', answer: 'WebP typically achieves the best compression ratios, followed by JPG for photos and PNG for graphics with transparency.' },
    ],
  },
  {
    i18nKey: 'removeBg',
    slug: 'remove-background',
    titleSuffix: 'Free Online AI Background Remover',
    metaDescription: 'Remove image backgrounds automatically using AI. Get transparent PNG images in seconds. Free online background removal tool.',
    category: 'Image',
    relatedSlugs: ['compress-image', 'image-resize', 'image-converter', 'images-to-pdf'],
    keywords: 'remove background, background remover, transparent background, remove bg, ai background removal',
    features: [
      'AI-powered automatic background removal',
      'Get transparent PNG output',
      'Works with photos, products, portraits',
      'Free and instant processing',
    ],
    faqs: [
      { question: 'How does background removal work?', answer: 'Our AI model automatically detects the subject in your image and removes the background, producing a transparent PNG file.' },
      { question: 'What types of images work best?', answer: 'The tool works best with clear subjects — product photos, portraits, and objects with distinct edges.' },
      { question: 'What format is the output?', answer: 'The output is always a PNG file with a transparent background.' },
    ],
  },
  {
    i18nKey: 'imageToSvg',
    slug: 'image-to-svg',
    titleSuffix: 'Free Online Image to SVG Converter',
    metaDescription: 'Convert PNG, JPG, and WebP images to scalable SVG vector format online for free. Perfect for logos, icons, and graphics that need to scale without quality loss.',
    category: 'Image',
    relatedSlugs: ['image-converter', 'compress-image', 'image-resize', 'remove-background'],
    keywords: 'image to svg, png to svg, jpg to svg, raster to vector, convert image to svg, vectorize image, image vectorizer',
    features: [
      'Convert raster images (PNG, JPG, WebP) to SVG',
      'Color or black-and-white tracing modes',
      'Scalable vector output — no pixelation',
      'Perfect for logos, icons, and illustrations',
    ],
    faqs: [
      { question: 'What image formats can I convert to SVG?', answer: 'You can convert PNG, JPG, JPEG, and WebP images to SVG vector format.' },
      { question: 'What is the difference between color and binary mode?', answer: 'Color mode preserves the full color palette. Binary mode converts the image to black and white first, producing cleaner vector paths — ideal for logos and line art.' },
      { question: 'Will the SVG be editable?', answer: 'Yes, the output SVG contains vector paths that can be edited in any vector editor such as Adobe Illustrator, Inkscape, or Figma.' },
      { question: 'Is there a file size limit?', answer: 'Images up to 10 MB are supported. For best results, use images under 4000×4000 pixels.' },
    ],
  },
  {
    i18nKey: 'ocr',
    slug: 'ocr',
    titleSuffix: 'Free Online OCR — Text Recognition Tool',
    metaDescription: 'Extract text from images and scanned PDFs using OCR (Optical Character Recognition). Supports English, Arabic, and French. Free online.',
    category: 'AI',
    relatedSlugs: ['pdf-to-word', 'summarize-pdf', 'translate-pdf', 'pdf-to-excel'],
    keywords: 'ocr, optical character recognition, extract text from image, scan to text, image to text',
    features: [
      'Extract text from images and scanned PDFs',
      'Supports English, Arabic, and French',
      'High accuracy with Tesseract OCR engine',
      'Free with no signup needed',
    ],
    faqs: [
      { question: 'What is OCR?', answer: 'OCR (Optical Character Recognition) is a technology that converts images of text into editable, searchable text data.' },
      { question: 'What languages are supported?', answer: 'We currently support English, Arabic, and French for text recognition.' },
      { question: 'Can I OCR a scanned PDF?', answer: 'Yes, you can upload scanned PDF documents and extract text from all pages.' },
    ],
  },

  // ─── CONVERT TOOLS ──────────────────────────────────────────
  {
    i18nKey: 'pdfToExcel',
    slug: 'pdf-to-excel',
    titleSuffix: 'Free Online PDF to Excel Converter',
    metaDescription: 'Convert PDF tables to Excel spreadsheets online for free. Extract tabular data from PDF files into editable XLSX format.',
    category: 'Convert',
    relatedSlugs: ['pdf-to-word', 'extract-tables', 'pdf-to-images', 'compress-pdf'],
    keywords: 'pdf to excel, pdf to xlsx, convert pdf to excel, extract tables from pdf, pdf spreadsheet',
    features: [
      'Extract tables from PDF to Excel',
      'Preserve table structure and data',
      'Download as XLSX format',
      'Free and secure',
    ],
    faqs: [
      { question: 'How do I convert a PDF to Excel?', answer: 'Upload your PDF containing tables. Our tool detects and extracts the tabular data, converting it into an editable Excel spreadsheet.' },
      { question: 'Does it work with scanned PDFs?', answer: 'The tool works best with digitally-created PDFs. For scanned documents, use our OCR tool first to extract text.' },
    ],
  },
  {
    i18nKey: 'htmlToPdf',
    slug: 'html-to-pdf',
    titleSuffix: 'Free Online HTML to PDF Converter',
    metaDescription: 'Convert HTML files to PDF documents online for free. Full CSS styling support, perfect for web page archival and printing.',
    category: 'Convert',
    relatedSlugs: ['pdf-to-word', 'word-to-pdf', 'compress-pdf', 'watermark-pdf'],
    keywords: 'html to pdf, convert html to pdf, webpage to pdf, html pdf converter, save html as pdf',
    features: [
      'Convert HTML to PDF with full CSS support',
      'Preserve page layout and styles',
      'Perfect for web page archival',
      'Free and instant',
    ],
    faqs: [
      { question: 'How do I convert HTML to PDF?', answer: 'Upload your HTML file and our converter will render it with full CSS support and produce a professional PDF document.' },
      { question: 'Are CSS styles preserved?', answer: 'Yes, our converter supports CSS styling including fonts, colors, layouts, and media queries.' },
    ],
  },

  // ─── AI TOOLS ───────────────────────────────────────────────
  {
    i18nKey: 'chatPdf',
    slug: 'chat-pdf',
    titleSuffix: 'Chat with PDF — AI Document Assistant',
    metaDescription: 'Ask questions about your PDF documents and get instant AI-powered answers. Free online PDF chat assistant.',
    category: 'AI',
    relatedSlugs: ['summarize-pdf', 'translate-pdf', 'extract-tables', 'pdf-to-word'],
    keywords: 'chat with pdf, ai pdf reader, ask pdf questions, pdf chat, ai document reader',
    features: [
      'Ask questions about any PDF document',
      'Get accurate AI-powered answers',
      'Understands context and meaning',
      'Free and private',
    ],
    faqs: [
      { question: 'How does Chat with PDF work?', answer: 'Upload your PDF and type a question. Our AI reads the document content and provides accurate answers based on what is in the document.' },
      { question: 'Can it answer questions in other languages?', answer: 'Yes, the AI responds in the same language you use for your question.' },
    ],
  },
  {
    i18nKey: 'summarizePdf',
    slug: 'summarize-pdf',
    titleSuffix: 'Free Online AI PDF Summarizer',
    metaDescription: 'Get instant AI-generated summaries of your PDF documents. Choose short, medium, or detailed summaries. Free online tool.',
    category: 'AI',
    relatedSlugs: ['chat-pdf', 'translate-pdf', 'extract-tables', 'pdf-to-word'],
    keywords: 'summarize pdf, pdf summary, ai pdf summarizer, document summary, tldr pdf',
    features: [
      'AI-generated document summaries',
      'Choose summary length (short, medium, long)',
      'Covers key points and conclusions',
      'Free and instant',
    ],
    faqs: [
      { question: 'How does PDF summarization work?', answer: 'Upload your PDF and choose a summary length. Our AI analyzes the full document and generates a concise summary covering the main points.' },
      { question: 'What summary lengths are available?', answer: 'You can choose short (2-3 sentences), medium (1-2 paragraphs), or long (detailed coverage of all key points).' },
    ],
  },
  {
    i18nKey: 'translatePdf',
    slug: 'translate-pdf',
    titleSuffix: 'Free Online AI PDF Translator',
    metaDescription: 'Translate PDF documents to any language using AI. Free online PDF translation with preserved formatting.',
    category: 'AI',
    relatedSlugs: ['chat-pdf', 'summarize-pdf', 'ocr', 'pdf-to-word'],
    keywords: 'translate pdf, pdf translator, document translation, ai translation, multilingual pdf',
    features: [
      'Translate PDF content to any language',
      'AI-powered accurate translation',
      'Preserves document context',
      'Free and secure',
    ],
    faqs: [
      { question: 'How do I translate a PDF?', answer: 'Upload your PDF, select the target language, and our AI will translate the content while maintaining the original meaning and context.' },
      { question: 'What languages are supported?', answer: 'You can translate to and from virtually any language including English, Arabic, French, Spanish, German, Chinese, and many more.' },
    ],
  },
  {
    i18nKey: 'tableExtractor',
    slug: 'extract-tables',
    titleSuffix: 'Free Online PDF Table Extractor',
    metaDescription: 'Extract tables from PDF documents into structured data online for free. Detect and export tabular data from any PDF.',
    category: 'AI',
    relatedSlugs: ['pdf-to-excel', 'chat-pdf', 'summarize-pdf', 'pdf-to-word'],
    keywords: 'extract tables from pdf, pdf table extractor, pdf to table, detect pdf tables, table data extraction',
    features: [
      'Automatic table detection in PDFs',
      'Extract structured tabular data',
      'View tables with headers and rows',
      'Free and easy to use',
    ],
    faqs: [
      { question: 'How does table extraction work?', answer: 'Upload a PDF and our tool automatically detects tables on each page, extracting headers and data into a structured view you can review.' },
      { question: 'Can I export extracted tables?', answer: 'Yes, the extracted data is displayed in a structured format. For Excel export, use our PDF to Excel tool.' },
    ],
  },

  // ─── UTILITY TOOLS ──────────────────────────────────────────
  {
    i18nKey: 'qrCode',
    slug: 'qr-code',
    titleSuffix: 'Free Online QR Code Generator',
    metaDescription: 'Generate QR codes from text, URLs, or any data. Customize size and download as PNG. Free online QR code maker.',
    category: 'Utility',
    relatedSlugs: ['compress-image', 'image-converter', 'html-to-pdf', 'pdf-to-images'],
    keywords: 'qr code generator, create qr code, qr code maker, generate qr, qr code free',
    features: [
      'Generate QR codes from any text or URL',
      'Customize QR code size',
      'Download as high-quality PNG',
      'Instant generation, free forever',
    ],
    faqs: [
      { question: 'How do I create a QR code?', answer: 'Enter your text, URL, or data in the input field, choose the desired size, and click generate. Your QR code will be ready to download instantly.' },
      { question: 'What can I encode in a QR code?', answer: 'You can encode any text, URLs, email addresses, phone numbers, Wi-Fi credentials, and more.' },
    ],
  },
  {
    i18nKey: 'videoToGif',
    slug: 'video-to-gif',
    titleSuffix: 'Free Online Video to GIF Converter',
    metaDescription: 'Create animated GIFs from video clips online for free. Customize start time, duration, and quality.',
    category: 'Utility',
    relatedSlugs: ['compress-image', 'image-converter', 'image-resize'],
    keywords: 'video to gif, convert video to gif, gif maker, create gif from video, animated gif',
    features: [
      'Convert video clips to animated GIFs',
      'Customize start time and duration',
      'Adjust output quality',
      'Free and no registration',
    ],
    faqs: [
      { question: 'How do I create a GIF from a video?', answer: 'Upload a video file, set the start time and duration, choose the quality level, and download your animated GIF.' },
      { question: 'What video formats are supported?', answer: 'Most common video formats are supported including MP4, MOV, AVI, and WebM.' },
    ],
  },
  {
    i18nKey: 'wordCounter',
    slug: 'word-counter',
    titleSuffix: 'Free Online Word Counter Tool',
    metaDescription: 'Count words, characters, sentences, and paragraphs in your text instantly. Free online word counter and text analyzer.',
    category: 'Utility',
    relatedSlugs: ['text-cleaner', 'summarize-pdf', 'translate-pdf'],
    keywords: 'word counter, character counter, word count, text counter, letter counter',
    features: [
      'Count words, characters, sentences, paragraphs',
      'Real-time counting as you type',
      'Reading time estimate',
      'Free with no limits',
    ],
    faqs: [
      { question: 'How does the word counter work?', answer: 'Simply paste or type your text in the input area. Word count, character count, sentence count, and paragraph count update in real time.' },
      { question: 'Does it count spaces?', answer: 'Character count is shown both with and without spaces.' },
    ],
  },
  {
    i18nKey: 'textCleaner',
    slug: 'text-cleaner',
    titleSuffix: 'Free Online Text Cleaner & Formatter',
    metaDescription: 'Clean up your text by removing extra spaces, converting case, and formatting. Free online text cleaning tool.',
    category: 'Utility',
    relatedSlugs: ['word-counter', 'ocr', 'summarize-pdf'],
    keywords: 'text cleaner, clean text, remove extra spaces, text formatter, text cleanup tool',
    features: [
      'Remove extra whitespace and line breaks',
      'Convert text case (upper, lower, title)',
      'Clean up pasted text from various sources',
      'Instant results, free forever',
    ],
    faqs: [
      { question: 'What does the text cleaner do?', answer: 'It removes extra spaces, normalizes whitespace, converts text case, and cleans up formatting issues common when copying text from various sources.' },
      { question: 'Can I convert text to uppercase?', answer: 'Yes, you can convert text to uppercase, lowercase, or title case with a single click.' },
    ],
  },

  // ─── PHASE 2 – PDF CONVERSION ──────────────────────────────
  {
    i18nKey: 'pdfToPptx',
    slug: 'pdf-to-pptx',
    titleSuffix: 'Free Online PDF to PowerPoint Converter',
    metaDescription: 'Convert PDF files to PowerPoint (PPTX) presentations online for free. Each PDF page becomes a slide.',
    category: 'Convert',
    relatedSlugs: ['pptx-to-pdf', 'pdf-to-word', 'pdf-to-excel', 'pdf-to-images'],
    keywords: 'pdf to pptx, pdf to powerpoint, convert pdf to pptx, pdf to slides',
    features: [
      'Convert each PDF page to a PowerPoint slide',
      'High-quality image rendering',
      'No software installation needed',
      'Files auto-deleted after 30 minutes',
    ],
    faqs: [
      { question: 'How do I convert PDF to PowerPoint?', answer: 'Upload your PDF and our tool converts each page into a slide in a PPTX file. Download the result when ready.' },
      { question: 'Is formatting preserved?', answer: 'Each page is rendered as a high-quality image on its own slide, preserving the visual layout perfectly.' },
    ],
  },
  {
    i18nKey: 'excelToPdf',
    slug: 'excel-to-pdf',
    titleSuffix: 'Free Online Excel to PDF Converter',
    metaDescription: 'Convert Excel spreadsheets (XLSX, XLS) to PDF documents online for free. Preserve your table formatting.',
    category: 'Convert',
    relatedSlugs: ['pdf-to-excel', 'word-to-pdf', 'pptx-to-pdf'],
    keywords: 'excel to pdf, xlsx to pdf, convert excel to pdf, spreadsheet to pdf',
    features: [
      'Convert XLSX and XLS files to PDF',
      'Preserves table formatting and layout',
      'Powered by LibreOffice for accurate conversion',
      'Free with no signup required',
    ],
    faqs: [
      { question: 'Which Excel formats are supported?', answer: 'We support both XLSX (modern) and XLS (legacy) Excel formats.' },
      { question: 'Will my formulas be visible?', answer: 'The PDF will show the computed values, not the formulas, just like a print preview.' },
    ],
  },
  {
    i18nKey: 'pptxToPdf',
    slug: 'pptx-to-pdf',
    titleSuffix: 'Free Online PowerPoint to PDF Converter',
    metaDescription: 'Convert PowerPoint presentations (PPTX, PPT) to PDF online for free. Perfect for sharing slides.',
    category: 'Convert',
    relatedSlugs: ['pdf-to-pptx', 'word-to-pdf', 'excel-to-pdf'],
    keywords: 'pptx to pdf, powerpoint to pdf, convert pptx to pdf, ppt to pdf',
    features: [
      'Convert PPTX and PPT files to PDF',
      'Preserves slide layout and graphics',
      'Ideal for sharing presentations',
      'No account needed',
    ],
    faqs: [
      { question: 'Which PowerPoint formats work?', answer: 'Both PPTX and legacy PPT formats are supported.' },
      { question: 'Are animations preserved?', answer: 'PDF is a static format, so animations are not included, but all slide content and layout are preserved.' },
    ],
  },
  {
    i18nKey: 'signPdf',
    slug: 'sign-pdf',
    titleSuffix: 'Free Online PDF Signer',
    metaDescription: 'Add your signature image to any PDF document online for free. Sign PDF files without printing.',
    category: 'PDF',
    relatedSlugs: ['protect-pdf', 'watermark-pdf', 'pdf-editor', 'flatten-pdf'],
    keywords: 'sign pdf, add signature to pdf, pdf signer, electronic signature pdf',
    features: [
      'Upload your signature image (PNG/JPG)',
      'Place signature on any page',
      'No printing or scanning needed',
      'Secure — files deleted after 30 minutes',
    ],
    faqs: [
      { question: 'How do I sign a PDF?', answer: 'Upload your PDF and a signature image (PNG or JPG). Choose the page and position, then download the signed PDF.' },
      { question: 'Is this a legal electronic signature?', answer: 'This tool places a visual signature image on the PDF. For legally binding digital signatures, a certificate-based solution may be required depending on your jurisdiction.' },
    ],
  },

  // ─── PHASE 2 – PDF EXTRA TOOLS ─────────────────────────────
  {
    i18nKey: 'cropPdf',
    slug: 'crop-pdf',
    titleSuffix: 'Free Online PDF Cropper',
    metaDescription: 'Crop PDF pages by adjusting margins online for free. Trim unwanted whitespace from your documents.',
    category: 'PDF',
    relatedSlugs: ['rotate-pdf', 'split-pdf', 'pdf-editor', 'flatten-pdf'],
    keywords: 'crop pdf, trim pdf, pdf cropper, remove pdf margins, resize pdf pages',
    features: [
      'Adjust margins (top, bottom, left, right)',
      'Crop all or specific pages',
      'Remove unnecessary whitespace',
      'Free and no signup required',
    ],
    faqs: [
      { question: 'How do I crop a PDF?', answer: 'Upload your PDF, set the margin values to trim from each side, and download the cropped version.' },
      { question: 'Can I crop specific pages?', answer: 'Yes, you can specify which pages to crop or apply cropping to all pages at once.' },
    ],
  },
  {
    i18nKey: 'flattenPdf',
    slug: 'flatten-pdf',
    titleSuffix: 'Free Online PDF Flattener',
    metaDescription: 'Flatten PDF forms and annotations online for free. Convert interactive form fields into fixed content.',
    category: 'PDF',
    relatedSlugs: ['protect-pdf', 'sign-pdf', 'repair-pdf', 'pdf-editor'],
    keywords: 'flatten pdf, pdf flattener, remove form fields, flatten annotations',
    features: [
      'Remove interactive form fields',
      'Flatten annotations into fixed content',
      'Prevent further editing of form data',
      'Ideal for archiving filled forms',
    ],
    faqs: [
      { question: 'What does flattening a PDF mean?', answer: 'Flattening converts interactive elements (form fields, annotations) into static content that cannot be edited further.' },
      { question: 'Why should I flatten a PDF?', answer: 'Flattening is useful for archiving filled forms, reducing file size, and preventing accidental changes to form data.' },
    ],
  },
  {
    i18nKey: 'repairPdf',
    slug: 'repair-pdf',
    titleSuffix: 'Free Online PDF Repair Tool',
    metaDescription: 'Repair corrupted or damaged PDF files online for free. Fix broken PDFs and recover content.',
    category: 'PDF',
    relatedSlugs: ['flatten-pdf', 'compress-pdf', 'unlock-pdf', 'pdf-metadata'],
    keywords: 'repair pdf, fix pdf, broken pdf, corrupted pdf, pdf recovery',
    features: [
      'Fix corrupted PDF structures',
      'Recover readable pages from damaged files',
      'Re-write clean PDF output',
      'Free with no file size limits',
    ],
    faqs: [
      { question: 'Can this fix any broken PDF?', answer: 'Our tool attempts to recover as many pages as possible. Severely corrupted files may only be partially recoverable.' },
      { question: 'Is my data safe?', answer: 'Yes, all files are processed securely and deleted within 30 minutes.' },
    ],
  },
  {
    i18nKey: 'pdfMetadata',
    slug: 'pdf-metadata',
    titleSuffix: 'Free Online PDF Metadata Editor',
    metaDescription: 'View and edit PDF metadata (title, author, subject, keywords) online for free.',
    category: 'PDF',
    relatedSlugs: ['pdf-editor', 'repair-pdf', 'protect-pdf', 'flatten-pdf'],
    keywords: 'pdf metadata, edit pdf properties, pdf title, pdf author, pdf info editor',
    features: [
      'Edit title, author, subject, keywords',
      'Set custom creator information',
      'View existing metadata before editing',
      'Free online tool — no installation',
    ],
    faqs: [
      { question: 'What is PDF metadata?', answer: 'PDF metadata includes properties like title, author, subject, and keywords embedded in the document. Search engines and document managers use this information.' },
      { question: 'Can I remove metadata?', answer: 'Yes, leave fields blank to remove existing metadata values.' },
    ],
  },

  // ─── PHASE 2 – IMAGE & UTILITY ─────────────────────────────
  {
    i18nKey: 'imageCrop',
    slug: 'image-crop',
    titleSuffix: 'Free Online Image Cropper',
    metaDescription: 'Crop images online for free. Specify exact pixel coordinates to trim your photos and graphics.',
    category: 'Image',
    relatedSlugs: ['image-resize', 'image-rotate-flip', 'compress-image', 'image-converter'],
    keywords: 'crop image, image cropper, trim image, cut image, photo crop',
    features: [
      'Specify exact crop coordinates in pixels',
      'Supports PNG, JPG, and WebP',
      'High-quality output',
      'Free — no watermarks added',
    ],
    faqs: [
      { question: 'How do I crop an image?', answer: 'Upload your image, enter the left, top, right, and bottom pixel coordinates for the crop area, then download the result.' },
      { question: 'What formats are supported?', answer: 'PNG, JPG/JPEG, and WebP images are supported.' },
    ],
  },
  {
    i18nKey: 'imageRotateFlip',
    slug: 'image-rotate-flip',
    titleSuffix: 'Free Online Image Rotate & Flip Tool',
    metaDescription: 'Rotate and flip images online for free. Rotate by 90°, 180°, or 270° and flip horizontally or vertically.',
    category: 'Image',
    relatedSlugs: ['image-crop', 'image-resize', 'compress-image', 'image-converter'],
    keywords: 'rotate image, flip image, image rotator, mirror image, image orientation',
    features: [
      'Rotate images by 90°, 180°, or 270°',
      'Flip horizontally or vertically',
      'Combine rotation and flip in one step',
      'Supports PNG, JPG, and WebP',
    ],
    faqs: [
      { question: 'Can I rotate and flip at the same time?', answer: 'Yes, you can combine rotation and flip operations in a single step.' },
      { question: 'Does rotating affect quality?', answer: 'No, rotation is lossless for PNG. For JPG, the quality is preserved as closely as possible.' },
    ],
  },
  {
    i18nKey: 'barcode',
    slug: 'barcode-generator',
    titleSuffix: 'Free Online Barcode Generator',
    metaDescription: 'Generate barcodes online for free. Supports Code128, Code39, EAN-13, UPC-A, ISBN, and more formats.',
    category: 'Utility',
    relatedSlugs: ['qr-code'],
    keywords: 'barcode generator, create barcode, code128, ean13, upc barcode, free barcode',
    features: [
      'Support for Code128, Code39, EAN-13, UPC-A, ISBN and more',
      'Output as PNG or SVG',
      'Instant generation with preview',
      'Free with no limits',
    ],
    faqs: [
      { question: 'What barcode formats are supported?', answer: 'We support Code128, Code39, EAN-13, EAN-8, UPC-A, ISBN-13, ISBN-10, ISSN, and PZN barcode formats.' },
      { question: 'What is the difference between a barcode and a QR code?', answer: 'Barcodes are one-dimensional (linear) and hold less data. QR codes are two-dimensional and can store more information. Use both from our tools.' },
    ],
  },
];

const POPULAR_TOOL_SLUGS = [
  'pdf-to-word',
  'word-to-pdf',
  'compress-pdf',
  'merge-pdf',
  'image-converter',
  'image-resize',
  'compress-image',
  'ocr',
  'html-to-pdf',
  'pdf-to-excel',
  'qr-code',
  'video-to-gif',
] as const;

function dedupeExistingToolSlugs(slugs: string[], excludeSlugs: string[] = []): string[] {
  const excluded = new Set(excludeSlugs);
  const seen = new Set<string>();
  const validSlugs = new Set(TOOLS_SEO.map((tool) => tool.slug));

  return slugs.filter((slug) => {
    if (excluded.has(slug) || seen.has(slug) || !validSlugs.has(slug)) {
      return false;
    }

    seen.add(slug);
    return true;
  });
}

/** Look up a tool's SEO data by slug */
export function getToolSEO(slug: string): ToolSEO | undefined {
  return TOOLS_SEO.find((t) => t.slug === slug);
}

/** Get all tool slugs for sitemap generation */
export function getAllToolSlugs(): string[] {
  return TOOLS_SEO.map((t) => t.slug);
}

export function getPopularToolSlugs(limit = 4, excludeSlugs: string[] = []): string[] {
  return dedupeExistingToolSlugs([...POPULAR_TOOL_SLUGS], excludeSlugs).slice(0, limit);
}

export function getInternalLinkToolSlugs(currentSlug: string, limit = 8): string[] {
  const currentTool = getToolSEO(currentSlug);
  if (!currentTool) {
    return [];
  }

  const sameCategorySlugs = TOOLS_SEO
    .filter((tool) => tool.category === currentTool.category && tool.slug !== currentSlug)
    .map((tool) => tool.slug);

  const internalLinks = dedupeExistingToolSlugs(
    [...currentTool.relatedSlugs, ...sameCategorySlugs, ...POPULAR_TOOL_SLUGS],
    [currentSlug]
  );

  return internalLinks.slice(0, limit);
}
