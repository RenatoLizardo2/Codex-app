// Token estimation and sentence splitting utilities

/**
 * Estimates token count using ~4 characters per token heuristic.
 * Accurate enough for chunking boundaries without external tokenizer dependency.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Sentence-ending punctuation followed by whitespace or end of string,
// but not after common abbreviations or decimal numbers
const SENTENCE_SPLIT_REGEX =
  /(?<!\b(?:Dr|Mr|Mrs|Ms|Jr|Sr|St|vs|etc|Inc|Ltd|Corp|Prof|Gen|Gov|Sgt|Cpl|Pvt|Rev|Vol|Dept|Est|Fig|No|Approx))(?<!\d)([.!?])(?=\s+|$)/g;

export function splitIntoSentences(text: string): string[] {
  if (!text.trim()) return [];

  // Split by sentence-ending punctuation, keeping the delimiter attached
  const parts = text.split(SENTENCE_SPLIT_REGEX);
  const sentences: string[] = [];

  // Rejoin punctuation with its preceding text
  for (let i = 0; i < parts.length; i += 2) {
    const fragment = parts[i] ?? "";
    const punctuation = parts[i + 1] ?? "";
    const sentence = (fragment + punctuation).trim();
    if (sentence) {
      sentences.push(sentence);
    }
  }

  return sentences;
}
