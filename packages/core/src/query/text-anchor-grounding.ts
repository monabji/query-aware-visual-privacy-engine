import type { Region } from "../contracts.js";
import { boxToPolygon, unionBoxes, type Box } from "../geometry.js";
import { lineText, wordsInSpan, type OcrLine, type OcrResult } from "../text/ocr.js";
import type { TextFieldTarget } from "./intent.js";

/**
 * Ground a text-field question to OCR evidence: find the field's anchor
 * (e.g. "EXP") and its value (e.g. a date) on the same or the next line.
 *
 * The output is relevance only. It grants no permission to disclose any
 * sensitive content that overlaps it; that decision belongs to the policy.
 */

export const TEXT_ANCHOR_GROUNDING_VERSION = "text-anchor@1";

const DATE_VALUE = /\b(?:\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}[/.-]\d{2,4}|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)[A-Z]*[\s./-]*\d{2,4}|\d{4}[/.-]\d{1,2}(?:[/.-]\d{1,2})?)\b/i;

const RULES: Record<TextFieldTarget, { anchor: RegExp; value: RegExp }> = {
  expiry_date: {
    anchor: /\b(?:exp(?:iry|ires|iration)?(?:\s+date)?|use\s+by|best\s+before)\b\.?\s*[:\-]?/i,
    value: DATE_VALUE,
  },
  manufacture_date: {
    anchor: /\b(?:mfg|mfd|mfg\.?\s+date|manufactured(?:\s+on)?|date\s+of\s+manufacture)\b\.?\s*[:\-]?/i,
    value: DATE_VALUE,
  },
  batch_number: {
    anchor: /\b(?:batch|lot)(?:\s+(?:no|number|code))?\b\.?\s*[:\-]?/i,
    value: /\b[A-Z0-9][A-Z0-9-]{2,}\b/i,
  },
  strength: {
    // Strength values are self-describing; the anchor is the value itself.
    anchor: /(?=\d)/,
    value: /\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|g|ml|iu|%)(?:\s?\/\s?\d*\s?(?:ml|g|tablet))?\b/i,
  },
};

type Hit = { lineIndex: number; wordIndices: number[] };

function findOnLine(line: OcrLine, from: number, value: RegExp): number[] | null {
  const text = lineText(line).slice(from);
  const match = value.exec(text);
  if (!match) return null;
  const start = from + match.index;
  const indices = wordsInSpan(line, start, start + match[0].length);
  return indices.length > 0 ? indices : null;
}

function groundTarget(ocr: OcrResult, target: TextFieldTarget): Hit[] {
  const rule = RULES[target];
  const hits: Hit[] = [];
  ocr.lines.forEach((line, lineIndex) => {
    const text = lineText(line);
    if (target === "strength") {
      const value = findOnLine(line, 0, rule.value);
      if (value) hits.push({ lineIndex, wordIndices: value });
      return;
    }
    const anchor = rule.anchor.exec(text);
    if (!anchor) return;
    const anchorEnd = anchor.index + anchor[0].length;
    const anchorWords = wordsInSpan(line, anchor.index, Math.max(anchorEnd, anchor.index + 1));
    const sameLine = findOnLine(line, anchorEnd, rule.value);
    if (sameLine) {
      hits.push({ lineIndex, wordIndices: [...new Set([...anchorWords, ...sameLine])] });
      return;
    }
    hits.push({ lineIndex, wordIndices: anchorWords });
    const next = ocr.lines[lineIndex + 1];
    const nextValue = next ? findOnLine(next, 0, rule.value) : null;
    if (nextValue) hits.push({ lineIndex: lineIndex + 1, wordIndices: nextValue });
  });
  return hits;
}

export function groundTextField(ocr: OcrResult, target: TextFieldTarget): Region[] {
  return groundTarget(ocr, target).map((hit, index) => {
    const line = ocr.lines[hit.lineIndex] as OcrLine;
    const bounds: Box = unionBoxes(hit.wordIndices.map((i) => (line.words[i] as OcrLine["words"][number]).bounds));
    return {
      id: `relevant-${index}`,
      kind: "relevant",
      category: target,
      polygon: boxToPolygon(bounds),
      bounds,
      source: TEXT_ANCHOR_GROUNDING_VERSION,
    };
  });
}
