import type { FileType } from "@/types/database";
import type { ParsedDocument } from "@/types/rag";

import { parseMarkdown } from "./markdown-parser";
import { parsePdf } from "./pdf-parser";
import { parseText } from "./text-parser";
import { parseUrl } from "./url-parser";

export async function extractText(
  fileType: FileType,
  content: string | Buffer,
  sourceUrl?: string
): Promise<ParsedDocument> {
  try {
    switch (fileType) {
      case "pdf": {
        if (!Buffer.isBuffer(content)) {
          throw new Error("PDF parser requires a Buffer");
        }
        return await parsePdf(content);
      }
      case "md": {
        if (typeof content !== "string") {
          throw new Error("Markdown parser requires a string");
        }
        return parseMarkdown(content);
      }
      case "txt": {
        if (typeof content !== "string") {
          throw new Error("Text parser requires a string");
        }
        return parseText(content);
      }
      case "url": {
        if (!sourceUrl) {
          throw new Error("URL parser requires a source URL");
        }
        return await parseUrl(sourceUrl);
      }
      default: {
        const exhaustive: never = fileType;
        throw new Error(`Unsupported file type: ${exhaustive}`);
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parsing error";
    throw new Error(`[Parsers] Failed to extract text from ${fileType}: ${message}`);
  }
}

export { parseMarkdown } from "./markdown-parser";
export { parsePdf } from "./pdf-parser";
export { parseText } from "./text-parser";
export { parseUrl } from "./url-parser";
