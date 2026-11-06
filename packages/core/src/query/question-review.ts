import type { SensitiveCategory } from "../contracts.js";
import type { OcrResult } from "../text/ocr.js";
import { findSensitiveText } from "../text/sensitive-patterns.js";

/**
 * Local review of the outgoing question text, which can itself carry private
 * data. Returns the categories found, never the matched strings, so callers
 * can explain a finding without echoing it.
 */
export function reviewQuestion(question: string): { categories: SensitiveCategory[] } {
  const words = question.split(/\s+/).filter(Boolean);
  const pseudoOcr: OcrResult = {
    engine: "question-text",
    lines: [
      {
        words: words.map((text) => ({ text, bounds: { x: 0, y: 0, width: 0, height: 0 }, confidence: 1 })),
        bounds: { x: 0, y: 0, width: 0, height: 0 },
      },
    ],
  };
  const categories = [...new Set(findSensitiveText(pseudoOcr).map((match) => match.category))].sort();
  return { categories };
}
