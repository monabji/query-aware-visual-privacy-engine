import { describe, expect, it } from "vitest";
import { lineText, locateFragment, wordsInSpan } from "../src/text/ocr.js";
import { syntheticOcr } from "./helpers.js";

describe("locateFragment", () => {
  it("finds a fragment case-insensitively and maps it to words", () => {
    const line = syntheticOcr(["Patient: Jo Fictional"]).lines[0]!;
    const span = locateFragment(lineText(line), "jo fictional");
    expect(span).toEqual({ start: 9, end: 21 });
    expect(wordsInSpan(line, span!.start, span!.end)).toEqual([1, 2]);
  });

  it("removes WordPiece markers", () => {
    expect(locateFragment("Sam Placeholder", "Place ##holder")).toEqual({ start: 4, end: 15 });
  });

  it("maps repeated fragments in order using the search start", () => {
    const text = "Lee met Lee";
    const first = locateFragment(text, "Lee");
    expect(first).toEqual({ start: 0, end: 3 });
    expect(locateFragment(text, "Lee", first!.end)).toEqual({ start: 8, end: 11 });
  });

  it("treats regex characters literally and returns null when absent", () => {
    expect(locateFragment("Total (net) 5", "(net)")).toEqual({ start: 6, end: 11 });
    expect(locateFragment("Patient: Jo", "Alex")).toBeNull();
    expect(locateFragment("anything", "  ")).toBeNull();
  });
});
