import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { extractFromText, type PdfExtraction, type PdfText } from './pdfExtract';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractFromPdf(file: File): Promise<PdfExtraction> {
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const items: PdfText[] = [];
  for (let page = 1; page <= doc.numPages; page++) {
    const content = await (await doc.getPage(page)).getTextContent();
    for (const it of content.items) {
      if (!('str' in it)) continue;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width, page });
    }
  }
  return extractFromText(items, doc.numPages);
}
