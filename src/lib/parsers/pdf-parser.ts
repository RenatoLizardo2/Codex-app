import type { ParsedDocument } from "@/src/types/rag";

const EXCESSIVE_WHITESPACE_REGEX = /[ \t]{2,}/g;
const EXCESSIVE_NEWLINES_REGEX = /\n{3,}/g;

export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  // pdfjs-dist 5.x references DOMMatrix at module load time — not available in Node.js.
  if (typeof globalThis.DOMMatrix === "undefined") {
    // @ts-expect-error — minimal no-op polyfill; we don't use matrix transforms
    globalThis.DOMMatrix = class DOMMatrix {};
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // pdfjs-dist 5.x requires a non-empty workerSrc even in Node.js (fake worker mode).
  // import.meta.resolve returns a file:// URL at runtime — works locally and on Vercel.
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = import.meta.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
  }

  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;

  // Extract text from all pages
  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .filter((item) => "str" in item)
      .map((item) => (item as { str: string }).str)
      .join(" ");
    pageTexts.push(pageText);
  }

  let content = pageTexts.join("\n\n");
  content = content
    .replace(EXCESSIVE_WHITESPACE_REGEX, " ")
    .replace(EXCESSIVE_NEWLINES_REGEX, "\n\n")
    .trim();

  if (!content) {
    console.warn("[Parsers] PDF produced empty text");
  }

  // Extract metadata
  const metadata = await doc.getMetadata().catch(() => null);
  const info = metadata?.info as Record<string, unknown> | undefined;
  const title = info?.Title ? String(info.Title) : undefined;

  await doc.destroy();

  return {
    content,
    metadata: {
      title,
      pageCount: doc.numPages,
    },
  };
}
