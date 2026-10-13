import './polyfills';
// Build "legacy" do pdf.js: inclui polyfills para navegadores móveis mais antigos (Safari/iOS).
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractFromText, type PdfExtraction, type PdfText } from './pdfExtract';

pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' });

export async function extractFromPdf(file: File, onProgress?: (pagina: number, total: number) => void): Promise<PdfExtraction> {
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const items: PdfText[] = [];
  for (let page = 1; page <= doc.numPages; page++) {
    onProgress?.(page, doc.numPages);
    const content = await (await doc.getPage(page)).getTextContent();
    for (const it of content.items) {
      if (!('str' in it)) continue;
      const [a, b] = it.transform;
      const size = Math.hypot(a, b) || 1;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width, page, dir: [a / size, b / size], size });
    }
  }
  return extractFromText(items, doc.numPages);
}
