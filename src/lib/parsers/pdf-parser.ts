import pdfParse from "pdf-parse";

import type { ParsedDocument } from "@/types/rag";

const EXCESSIVE_WHITESPACE_REGEX = /[ \t]{2,}/g;
const EXCESSIVE_NEWLINES_REGEX = /\n{3,}/g;

export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const result = await pdfParse(buffer);

  let content = result.text || "";
  content = content
    .replace(EXCESSIVE_WHITESPACE_REGEX, " ")
    .replace(EXCESSIVE_NEWLINES_REGEX, "\n\n")
    .trim();

  if (!content) {
    console.warn("[Parsers] PDF produced empty text");
  }

  const title = result.info?.Title
    ? String(result.info.Title)
    : undefined;

  return {
    content,
    metadata: {
      title,
      pageCount: result.numpages,
    },
  };
}
