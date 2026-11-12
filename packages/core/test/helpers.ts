import type { OcrLine, OcrResult } from "../src/text/ocr.js";

/**
 * Build synthetic OCR output for tests: each string is one line, words are
 * laid out left to right with a fixed character width.
 */
export function syntheticOcr(lines: readonly string[], charWidth = 10, lineHeight = 20): OcrResult {
  return {
    engine: "test-fixture",
    lines: lines.map((text, row): OcrLine => {
      let x = 0;
      const words = text.split(" ").filter(Boolean).map((word) => {
        const bounds = { x, y: row * lineHeight, width: word.length * charWidth, height: lineHeight - 4 };
        x += (word.length + 1) * charWidth;
        return { text: word, bounds, confidence: 0.95 };
      });
      const width = Math.max(0, x - charWidth);
      return { words, bounds: { x: 0, y: row * lineHeight, width, height: lineHeight - 4 } };
    }),
  };
}
