import type { ParsedDocument } from "@/types/rag";

const FETCH_TIMEOUT_MS = 10_000;
const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/i;
const SCRIPT_STYLE_REGEX = /<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_TAG_REGEX = /<\/?[^>]+(>|$)/g;
const EXCESSIVE_WHITESPACE_REGEX = /[ \t]{2,}/g;
const EXCESSIVE_NEWLINES_REGEX = /\n{3,}/g;

function stripHtml(html: string): string {
  let text = html;
  text = text.replace(SCRIPT_STYLE_REGEX, "");
  text = text.replace(HTML_TAG_REGEX, " ");
  text = text.replace(/&nbsp;/gi, " ");
  text = text.replace(/&amp;/gi, "&");
  text = text.replace(/&lt;/gi, "<");
  text = text.replace(/&gt;/gi, ">");
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(EXCESSIVE_WHITESPACE_REGEX, " ");
  text = text.replace(EXCESSIVE_NEWLINES_REGEX, "\n\n");
  return text.trim();
}

function extractTitle(html: string): string | undefined {
  const match = TITLE_REGEX.exec(html);
  return match ? match[1].trim() : undefined;
}

export async function parseUrl(url: string): Promise<ParsedDocument> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TheCodex/1.0 (document-indexer)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (contentType.includes("application/pdf")) {
      const { parsePdf } = await import("./pdf-parser");
      return parsePdf(buffer);
    }

    const html = buffer.toString("utf-8");
    const title = extractTitle(html);
    const content = stripHtml(html);

    return {
      content,
      metadata: {
        title,
      },
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`URL fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
