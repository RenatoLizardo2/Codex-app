// Chunking — semantic text chunking with overlap and metadata preservation

import { ragConfig } from "@/src/config/rag";
import { estimateTokenCount, splitIntoSentences } from "@/src/lib/utils/tokens";

import type { TextChunk } from "@/src/types/rag";

export type ChunkingOptions = {
  maxTokens?: number;
  minTokens?: number;
  overlapPercentage?: number;
};

type ParagraphMeta = {
  text: string;
  pageNumber: number | null;
  sectionTitle: string | null;
};

function parseParagraphs(text: string): ParagraphMeta[] {
  const paragraphs: ParagraphMeta[] = [];
  let currentPage = 1;
  let hasPageBreaks = false;
  let currentSection: string | null = null;

  // Check if text contains form feed characters (PDF page breaks)
  if (text.includes("\f")) {
    hasPageBreaks = true;
  }

  const rawParagraphs = text.split(/\n\n+/);

  for (const raw of rawParagraphs) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Count form feeds within this paragraph to track page numbers
    if (hasPageBreaks) {
      const formFeeds = (raw.match(/\f/g) || []).length;
      currentPage += formFeeds;
    }

    // Detect Markdown headings to track section titles
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/m);
    if (headingMatch) {
      currentSection = headingMatch[2]?.trim() ?? null;
    }

    // Clean form feeds from the text content
    const cleanText = trimmed.replace(/\f/g, "").trim();
    if (!cleanText) continue;

    paragraphs.push({
      text: cleanText,
      pageNumber: hasPageBreaks ? currentPage : null,
      sectionTitle: currentSection,
    });
  }

  return paragraphs;
}

function splitOversizedParagraph(
  paragraph: ParagraphMeta,
  maxTokens: number
): ParagraphMeta[] {
  const sentences = splitIntoSentences(paragraph.text);
  if (sentences.length === 0) return [paragraph];

  const subParagraphs: ParagraphMeta[] = [];
  let currentGroup: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence);

    // If a single sentence exceeds maxTokens, include it as its own chunk
    if (sentenceTokens > maxTokens) {
      if (currentGroup.length > 0) {
        subParagraphs.push({
          text: currentGroup.join(" "),
          pageNumber: paragraph.pageNumber,
          sectionTitle: paragraph.sectionTitle,
        });
        currentGroup = [];
        currentTokens = 0;
      }
      subParagraphs.push({
        text: sentence,
        pageNumber: paragraph.pageNumber,
        sectionTitle: paragraph.sectionTitle,
      });
      continue;
    }

    if (currentTokens + sentenceTokens > maxTokens && currentGroup.length > 0) {
      subParagraphs.push({
        text: currentGroup.join(" "),
        pageNumber: paragraph.pageNumber,
        sectionTitle: paragraph.sectionTitle,
      });
      currentGroup = [];
      currentTokens = 0;
    }

    currentGroup.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (currentGroup.length > 0) {
    subParagraphs.push({
      text: currentGroup.join(" "),
      pageNumber: paragraph.pageNumber,
      sectionTitle: paragraph.sectionTitle,
    });
  }

  return subParagraphs;
}

function mergeParagraphsIntoChunks(
  paragraphs: ParagraphMeta[],
  minTokens: number,
  maxTokens: number
): ParagraphMeta[] {
  const chunks: ParagraphMeta[] = [];
  let accumText: string[] = [];
  let accumTokens = 0;
  let currentPageNumber: number | null = null;
  let currentSectionTitle: string | null = null;

  for (const para of paragraphs) {
    const paraTokens = estimateTokenCount(para.text);

    // If adding this paragraph would exceed max, flush the accumulator first
    if (accumTokens + paraTokens > maxTokens && accumText.length > 0) {
      chunks.push({
        text: accumText.join("\n\n"),
        pageNumber: currentPageNumber,
        sectionTitle: currentSectionTitle,
      });
      accumText = [];
      accumTokens = 0;
      currentPageNumber = null;
      currentSectionTitle = null;
    }

    accumText.push(para.text);
    accumTokens += paraTokens;
    if (currentPageNumber === null) currentPageNumber = para.pageNumber;
    if (currentSectionTitle === null) currentSectionTitle = para.sectionTitle;
    // Update section title to latest if paragraph has one
    if (para.sectionTitle) currentSectionTitle = para.sectionTitle;

    // If we've reached minimum threshold, flush
    if (accumTokens >= minTokens) {
      chunks.push({
        text: accumText.join("\n\n"),
        pageNumber: currentPageNumber,
        sectionTitle: currentSectionTitle,
      });
      accumText = [];
      accumTokens = 0;
      currentPageNumber = null;
      currentSectionTitle = null;
    }
  }

  // Flush remaining accumulated text
  if (accumText.length > 0) {
    // If there's a previous chunk and the remaining is very small, merge with it
    if (chunks.length > 0 && accumTokens < minTokens / 2) {
      const lastChunk = chunks[chunks.length - 1]!;
      lastChunk.text = lastChunk.text + "\n\n" + accumText.join("\n\n");
    } else {
      chunks.push({
        text: accumText.join("\n\n"),
        pageNumber: currentPageNumber,
        sectionTitle: currentSectionTitle,
      });
    }
  }

  return chunks;
}

function applyOverlap(
  chunks: ParagraphMeta[],
  overlapPercentage: number,
  maxTokens: number
): ParagraphMeta[] {
  if (chunks.length <= 1 || overlapPercentage <= 0) return chunks;

  const overlapTokenTarget = Math.floor(maxTokens * overlapPercentage);
  const result: ParagraphMeta[] = [chunks[0]!];

  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1]!;
    const currentChunk = chunks[i]!;

    // Extract overlap text from the end of the previous chunk
    const prevSentences = splitIntoSentences(prevChunk.text);
    const overlapSentences: string[] = [];
    let overlapTokens = 0;

    // Walk backwards through previous chunk's sentences to get ~overlapTokenTarget tokens
    for (let j = prevSentences.length - 1; j >= 0; j--) {
      const sentence = prevSentences[j]!;
      const sentenceTokens = estimateTokenCount(sentence);
      if (overlapTokens + sentenceTokens > overlapTokenTarget && overlapSentences.length > 0) {
        break;
      }
      overlapSentences.unshift(sentence);
      overlapTokens += sentenceTokens;
    }

    if (overlapSentences.length > 0) {
      const overlapText = overlapSentences.join(" ");
      result.push({
        text: overlapText + "\n\n" + currentChunk.text,
        pageNumber: currentChunk.pageNumber,
        sectionTitle: currentChunk.sectionTitle,
      });
    } else {
      result.push(currentChunk);
    }
  }

  return result;
}

export function chunkText(
  text: string,
  options?: ChunkingOptions
): TextChunk[] {
  if (!text || !text.trim()) return [];

  const maxTokens = options?.maxTokens ?? ragConfig.chunking.maxTokens;
  const minTokens = options?.minTokens ?? ragConfig.chunking.minTokens;
  const overlapPercentage =
    options?.overlapPercentage ?? ragConfig.chunking.overlapPercentage;

  // Step 1: Parse into paragraphs with metadata
  const paragraphs = parseParagraphs(text);
  if (paragraphs.length === 0) return [];

  // Step 2: Split oversized paragraphs by sentences
  const processedParagraphs: ParagraphMeta[] = [];
  for (const para of paragraphs) {
    const tokens = estimateTokenCount(para.text);
    if (tokens > maxTokens) {
      processedParagraphs.push(...splitOversizedParagraph(para, maxTokens));
    } else {
      processedParagraphs.push(para);
    }
  }

  // Step 3: Merge small paragraphs into chunks within token limits
  const mergedChunks = mergeParagraphsIntoChunks(
    processedParagraphs,
    minTokens,
    maxTokens
  );

  // Step 4: Apply overlap between adjacent chunks
  const overlappedChunks = applyOverlap(mergedChunks, overlapPercentage, maxTokens);

  // Step 5: Annotate with index and token count
  return overlappedChunks.map((chunk, index) => ({
    content: chunk.text,
    index,
    pageNumber: chunk.pageNumber,
    sectionTitle: chunk.sectionTitle,
    tokenCount: estimateTokenCount(chunk.text),
  }));
}
