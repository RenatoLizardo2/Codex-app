import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

import type { ParsedDocument } from "@/src/types/rag";

// Disable worker — we run server-side only
pdfjs.GlobalWorkerOptions.workerSrc = "";

const EXCESSIVE_WHITESPACE_REGEX = /[ \t]{2,}/g;
const EXCESSIVE_NEWLINES_REGEX = /\n{3,}/g;

export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;

  // Extract text from all pages
  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .filter((item): item is { str: string } => "str" in item)
      .map((item) => item.str)
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
