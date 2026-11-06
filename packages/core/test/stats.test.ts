import { describe, expect, it } from "vitest";
import { percentile, summarizeTimings } from "../src/measure/stats.js";

describe("percentile", () => {
  it("uses nearest rank", () => {
    const sample = [5, 1, 4, 2, 3];
    expect(percentile(sample, 50)).toBe(3);
    expect(percentile(sample, 95)).toBe(5);
    expect(percentile(sample, 0)).toBe(1);
  });

  it("rejects empty samples and out-of-range percentiles", () => {
    expect(() => percentile([], 50)).toThrow(RangeError);
    expect(() => percentile([1], 101)).toThrow(RangeError);
  });
});

describe("summarizeTimings", () => {
  it("summarizes a sample", () => {
    expect(summarizeTimings([10, 30, 20])).toEqual({ count: 3, minMs: 10, p50Ms: 20, p95Ms: 30, maxMs: 30 });
  });
});
