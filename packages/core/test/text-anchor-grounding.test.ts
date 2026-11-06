import { describe, expect, it } from "vitest";
import { groundTextField } from "../src/query/text-anchor-grounding.js";
import { syntheticOcr } from "./helpers.js";

describe("groundTextField", () => {
  const ocr = syntheticOcr(["PARAMOL 500 mg", "BATCH: K2291", "EXP 08/2027", "Patient: Jo Fictional"]);

  it("grounds an anchor and same-line value", () => {
    const [region] = groundTextField(ocr, "expiry_date");
    expect(region?.bounds).toEqual({ x: 0, y: 40, width: 110, height: 16 });
    expect(region?.kind).toBe("relevant");
  });

  it("finds a value on the next line when the anchor ends its line", () => {
    const regions = groundTextField(syntheticOcr(["Use by", "12/2026"]), "expiry_date");
    expect(regions.map((r) => r.bounds.y)).toEqual([0, 20]);
  });

  it("grounds strength values without an anchor", () => {
    const [region] = groundTextField(ocr, "strength");
    expect(region?.bounds).toEqual({ x: 80, y: 0, width: 60, height: 16 });
  });

  it("returns nothing when the evidence is absent", () => {
    expect(groundTextField(ocr, "manufacture_date")).toEqual([]);
  });
});
