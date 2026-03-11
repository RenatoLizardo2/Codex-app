import type { ParsedDocument } from "@/types/rag";

const MAX_TITLE_LENGTH = 200;

export function parseText(content: string): ParsedDocument {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  const firstLine = normalized.split("\n").find((line) => line.trim().length > 0);
  const title = firstLine
    ? firstLine.trim().slice(0, MAX_TITLE_LENGTH)
    : undefined;

  return {
    content: normalized,
    metadata: {
      title,
    },
  };
}
