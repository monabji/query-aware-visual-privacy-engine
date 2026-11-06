import type { Region, SensitiveCategory } from "../contracts.js";
import { boxToPolygon, unionBoxes } from "../geometry.js";
import { lineText, wordsInSpan, type OcrLine, type OcrResult } from "./ocr.js";

/**
 * Deterministic sensitive-text detection over OCR output.
 *
 * Two mechanisms, both local and inspectable:
 *  1. Value patterns (email, phone, long identifiers, labelled birth dates).
 *  2. Field labels ("Name:", "Patient", "Address") whose following value is
 *     treated as sensitive, optionally continuing onto the next line.
 *
 * Names and addresses without a label need a local NER model; this module
 * does not claim to find them. Results are conservative word-box unions.
 */

export const SENSITIVE_PATTERNS_VERSION = "sensitive-patterns@1";

type ValuePattern = {
  readonly category: SensitiveCategory;
  readonly pattern: RegExp;
};

const VALUE_PATTERNS: readonly ValuePattern[] = [
  { category: "email_address", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  {
    category: "phone_number",
    // Optional country code, then 9+ digits allowing common separators.
    pattern: /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,5}\)[\s.-]?)?\d(?:[\s.-]?\d){8,13}/g,
  },
  {
    category: "identifier_number",
    // Alphanumeric tokens with at least 6 digits, e.g. member, account, MRN numbers.
    pattern: /\b(?=[A-Z0-9-]*\d(?:[A-Z-]*\d){5})[A-Z0-9][A-Z0-9-]{5,}\b/gi,
  },
];

type FieldLabel = {
  readonly category: SensitiveCategory;
  readonly pattern: RegExp;
  /** Number of following lines also treated as the field value (e.g. multi-line addresses). */
  readonly continuationLines: number;
};

const FIELD_LABELS: readonly FieldLabel[] = [
  { category: "person_name", pattern: /\b(?:patient(?:\s+name)?|(?<!(?:product|brand|generic|drug|trade)\s)name|prescribed\s+for|customer|insured)\b\s*[:\-]?/i, continuationLines: 0 },
  { category: "postal_address", pattern: /\b(?:address|addr\.?)\b\s*[:\-]?/i, continuationLines: 2 },
  { category: "date_of_birth", pattern: /\b(?:dob|d\.o\.b\.?|date\s+of\s+birth|born)\b\s*[:\-]?/i, continuationLines: 0 },
  { category: "phone_number", pattern: /\b(?:tel|phone|mobile|ph)\b\.?\s*[:\-]?/i, continuationLines: 0 },
];

export type SensitiveTextMatch = {
  readonly category: SensitiveCategory;
  readonly lineIndex: number;
  readonly wordIndices: readonly number[];
  readonly mechanism: "value_pattern" | "field_label";
};

function digitsIn(text: string): number {
  return (text.match(/\d/g) ?? []).length;
}

function valueMatches(line: OcrLine, lineIndex: number): SensitiveTextMatch[] {
  const text = lineText(line);
  const matches: SensitiveTextMatch[] = [];
  for (const { category, pattern } of VALUE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      const value = match[0];
      if (category === "phone_number" && digitsIn(value) < 9) continue;
      const wordIndices = wordsInSpan(line, start, start + value.length);
      if (wordIndices.length > 0) {
        matches.push({ category, lineIndex, wordIndices, mechanism: "value_pattern" });
      }
    }
  }
  return matches;
}

function labelMatches(lines: readonly OcrLine[], lineIndex: number): SensitiveTextMatch[] {
  const line = lines[lineIndex];
  if (!line) return [];
  const text = lineText(line);
  const matches: SensitiveTextMatch[] = [];
  for (const label of FIELD_LABELS) {
    const found = label.pattern.exec(text);
    if (!found) continue;
    const valueStart = found.index + found[0].length;
    // Words wholly or partly inside the label are the label, not the value.
    const labelWords = new Set(wordsInSpan(line, found.index, valueStart));
    const valueOnLine = wordsInSpan(line, valueStart, text.length).filter(
      (index) => !labelWords.has(index),
    );
    if (valueOnLine.length > 0) {
      matches.push({ category: label.category, lineIndex, wordIndices: valueOnLine, mechanism: "field_label" });
    }
    const continuation = valueOnLine.length > 0 ? label.continuationLines : Math.max(1, label.continuationLines);
    for (let offset = 1; offset <= continuation; offset += 1) {
      const next = lines[lineIndex + offset];
      if (!next || next.words.length === 0) break;
      if (FIELD_LABELS.some((other) => other.pattern.test(lineText(next)))) break;
      matches.push({
        category: label.category,
        lineIndex: lineIndex + offset,
        wordIndices: next.words.map((_, index) => index),
        mechanism: "field_label",
      });
    }
  }
  return matches;
}

/** Find sensitive spans in OCR output. Pure and deterministic. */
export function findSensitiveText(ocr: OcrResult): SensitiveTextMatch[] {
  const matches: SensitiveTextMatch[] = [];
  ocr.lines.forEach((line, lineIndex) => {
    matches.push(...valueMatches(line, lineIndex));
    matches.push(...labelMatches(ocr.lines, lineIndex));
  });
  return matches;
}

/** Convert matches to canonical-pixel regions (union of matched word boxes, unpadded). */
export function sensitiveTextRegions(ocr: OcrResult): Region[] {
  return findSensitiveText(ocr).map((match, index) => {
    const line = ocr.lines[match.lineIndex] as OcrLine;
    const boxes = match.wordIndices.map((wordIndex) => (line.words[wordIndex] as OcrLine["words"][number]).bounds);
    const bounds = unionBoxes(boxes);
    return {
      id: `text-${index}`,
      kind: "sensitive",
      category: match.category,
      polygon: boxToPolygon(bounds),
      bounds,
      source: SENSITIVE_PATTERNS_VERSION,
    };
  });
}
