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

/** Indices of words that overlap the half-open character span [start, end). */
export function wordsInSpan(line: OcrLine, start: number, end: number): number[] {
  return wordOffsets(line)
    .map((offset, index) => ({ ...offset, index }))
    .filter((offset) => offset.start < end && offset.end > start)
    .map((offset) => offset.index);
}
