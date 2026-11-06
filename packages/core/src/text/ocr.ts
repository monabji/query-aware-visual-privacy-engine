import type { Box } from "../geometry.js";

/** One recognized word in canonical image pixels. */
export type OcrWord = {
  readonly text: string;
  readonly bounds: Box;
  /** Engine-reported confidence in [0, 1]; engine-specific and uncalibrated. */
  readonly confidence: number;
};

/** A recognized line: an ordered sequence of words. */
export type OcrLine = {
  readonly words: readonly OcrWord[];
  readonly bounds: Box;
};

/** Result of an OCR adapter. Kept in client memory only; never logged. */
export type OcrResult = {
  readonly lines: readonly OcrLine[];
  readonly engine: string;
};

export function lineText(line: OcrLine): string {
  return line.words.map((word) => word.text).join(" ");
}

/**
 * Character offsets of each word within `lineText(line)`, used to map a
 * matched character span back to the words (and boxes) it covers.
 */
export function wordOffsets(line: OcrLine): Array<{ start: number; end: number }> {
  const offsets: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const word of line.words) {
    offsets.push({ start: cursor, end: cursor + word.text.length });
    cursor += word.text.length + 1;
  }
  return offsets;
}

/**
 * Locate a model-reported text fragment (e.g. an NER entity without
 * character offsets) in `text`, searching from `fromIndex` so repeated
 * fragments map in order. Case-insensitive; WordPiece markers ("##") are
 * removed and whitespace runs match any whitespace. Returns null when the
 * fragment cannot be located, which callers must treat as a failure.
 */
export function locateFragment(text: string, fragment: string, fromIndex = 0): { start: number; end: number } | null {
  const cleaned = fragment.replace(/\s*##/g, "").trim();
  if (cleaned.length === 0) return null;
  const escaped = cleaned
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const pattern = new RegExp(escaped, "giu");
  pattern.lastIndex = fromIndex;
  const match = pattern.exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

/** Indices of words that overlap the half-open character span [start, end). */
export function wordsInSpan(line: OcrLine, start: number, end: number): number[] {
  return wordOffsets(line)
    .map((offset, index) => ({ ...offset, index }))
    .filter((offset) => offset.start < end && offset.end > start)
    .map((offset) => offset.index);
}
