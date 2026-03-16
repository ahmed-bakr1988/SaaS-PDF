let pdfLibLoader: Promise<typeof import('pdf-lib')> | null = null;

async function loadPdfLib() {
  if (!pdfLibLoader) {
    pdfLibLoader = import('pdf-lib');
  }

  return pdfLibLoader;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const { PDFDocument } = await loadPdfLib();
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
  });
  return pdf.getPageCount();
}