import type { ParsedDocument } from "@/types/rag";

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm;
const BOLD_ITALIC_REGEX = /(\*{1,3}|_{1,3})(.+?)\1/g;
const STRIKETHROUGH_REGEX = /~~(.+?)~~/g;
const LINK_REGEX = /\[([^\]]+)\]\([^)]+\)/g;
const IMAGE_REGEX = /!\[([^\]]*)\]\([^)]+\)/g;
const INLINE_CODE_REGEX = /`([^`]+)`/g;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const BLOCKQUOTE_REGEX = /^>\s?/gm;
const LIST_MARKER_REGEX = /^[\s]*[-*+]\s+/gm;
const ORDERED_LIST_REGEX = /^[\s]*\d+\.\s+/gm;
const HORIZONTAL_RULE_REGEX = /^[-*_]{3,}\s*$/gm;
const HTML_TAG_REGEX = /<\/?[^>]+(>|$)/g;

export function parseMarkdown(content: string): ParsedDocument {
  const sections: string[] = [];
  let title: string | undefined;

  let match: RegExpExecArray | null;
  const headingRegex = new RegExp(HEADING_REGEX.source, "gm");

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const headingText = match[2].trim();

    if (level === 1 && !title) {
      title = headingText;
    }

    sections.push(headingText);
  }

  let cleaned = content;
  cleaned = cleaned.replace(CODE_BLOCK_REGEX, "");
  cleaned = cleaned.replace(IMAGE_REGEX, "$1");
  cleaned = cleaned.replace(LINK_REGEX, "$1");
  cleaned = cleaned.replace(BOLD_ITALIC_REGEX, "$2");
  cleaned = cleaned.replace(STRIKETHROUGH_REGEX, "$1");
  cleaned = cleaned.replace(INLINE_CODE_REGEX, "$1");
  cleaned = cleaned.replace(BLOCKQUOTE_REGEX, "");
  cleaned = cleaned.replace(HEADING_REGEX, "$2");
  cleaned = cleaned.replace(LIST_MARKER_REGEX, "");
  cleaned = cleaned.replace(ORDERED_LIST_REGEX, "");
  cleaned = cleaned.replace(HORIZONTAL_RULE_REGEX, "");
  cleaned = cleaned.replace(HTML_TAG_REGEX, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return {
    content: cleaned,
    metadata: {
      title,
      sections,
    },
  };
}
