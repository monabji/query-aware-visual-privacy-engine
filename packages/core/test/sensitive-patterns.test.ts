import { describe, expect, it } from "vitest";
import { findSensitiveText, sensitiveTextRegions } from "../src/text/sensitive-patterns.js";
import { syntheticOcr } from "./helpers.js";

function categories(lines: string[]): string[] {
  return findSensitiveText(syntheticOcr(lines)).map((m) => m.category).sort();
}

describe("value patterns", () => {
  it("finds emails, phone numbers and long identifiers", () => {
    expect(categories(["contact jane.roe@example.org"])).toEqual(["email_address"]);
    expect(categories(["call +1 555 010 0199 today"])).toEqual(["phone_number"]);
    expect(categories(["Member ID AB12345678"])).toEqual(["identifier_number"]);
  });

  it("ignores short numbers such as doses and lot codes with few digits", () => {
    expect(categories(["Take 2 tablets 500 mg"])).toEqual([]);
    expect(categories(["LOT A12B"])).toEqual([]);
  });
});

describe("field labels", () => {
  it("marks the value after a name label, not the label itself", () => {
    const ocr = syntheticOcr(["Patient: Alex Example"]);
    const [match] = findSensitiveText(ocr);
    expect(match?.category).toBe("person_name");
    expect(match?.wordIndices).toEqual([1, 2]);
  });

  it("does not treat product or brand names as personal names", () => {
    expect(categories(["Product name: Paracetamol"])).toEqual([]);
  });

  it("continues an address onto following lines until another label", () => {
    const matches = findSensitiveText(
      syntheticOcr(["Address: 12 Sample Street", "Exampletown", "Name: Sam Placeholder"]),
    );
    const address = matches.filter((m) => m.category === "postal_address").map((m) => m.lineIndex);
    expect(address).toEqual([0, 1]);
    expect(matches.some((m) => m.category === "person_name" && m.lineIndex === 2)).toBe(true);
  });

  it("treats the next line as the value when a label ends its line", () => {
    const matches = findSensitiveText(syntheticOcr(["Prescribed for", "Jo Fictional"]));
    expect(matches).toContainEqual({
      category: "person_name",
      lineIndex: 1,
      wordIndices: [0, 1],
      mechanism: "field_label",
    });
  });
});

describe("regions", () => {
  it("returns canonical word-box unions tagged with the detector version", () => {
    const [region] = sensitiveTextRegions(syntheticOcr(["Name: Ana Test"]));
    expect(region?.bounds).toEqual({ x: 60, y: 0, width: 80, height: 16 });
    expect(region?.source).toBe("sensitive-patterns@1");
    expect(region?.kind).toBe("sensitive");
  });
});
