import { describe, expect, it } from "vitest";
import {
  GeometryError,
  clipBox,
  coverageByUnion,
  coverageOf,
  expandBox,
  polygonBounds,
  resizeTransform,
  toCanonical,
  toPixelBox,
  unionBoxes,
} from "../src/geometry.js";

const image = { width: 100, height: 50 };

describe("polygonBounds", () => {
  it("returns the axis-aligned bounds of a rotated quadrilateral", () => {
    const bounds = polygonBounds([
      { x: 10, y: 5 },
      { x: 30, y: 2 },
      { x: 32, y: 12 },
      { x: 12, y: 15 },
    ]);
    expect(bounds).toEqual({ x: 10, y: 2, width: 22, height: 13 });
  });

  it("rejects empty and non-finite polygons", () => {
    expect(() => polygonBounds([])).toThrow(GeometryError);
    expect(() => polygonBounds([{ x: Number.NaN, y: 0 }])).toThrow(GeometryError);
  });
});

describe("expandBox", () => {
  it("uses the larger of absolute and relative margins and clips to the image", () => {
    const expanded = expandBox({ x: 2, y: 10, width: 20, height: 10 }, image, {
      pixels: 3,
      fractionOfShortSide: 0.5,
    });
    // relative pad = 5 > 3; left edge clipped to 0
    expect(expanded).toEqual({ x: 0, y: 5, width: 27, height: 20 });
  });

  it("returns null for a box entirely outside the image", () => {
    expect(clipBox({ x: 200, y: 0, width: 5, height: 5 }, image)).toBeNull();
  });

  it("rejects negative margins", () => {
    expect(() =>
      expandBox({ x: 0, y: 0, width: 1, height: 1 }, image, { pixels: -1, fractionOfShortSide: 0 }),
    ).toThrow(GeometryError);
  });
});

describe("toPixelBox", () => {
  it("rounds outward so fractional edges are fully covered", () => {
    expect(toPixelBox({ x: 1.2, y: 2.8, width: 3.1, height: 0.4 })).toEqual({
      x: 1,
      y: 2,
      width: 4,
      height: 2,
    });
  });
});

describe("coverage", () => {
  const target = { x: 0, y: 0, width: 10, height: 10 };

  it("computes single-box coverage", () => {
    expect(coverageOf(target, { x: 5, y: 0, width: 20, height: 20 })).toBeCloseTo(0.5);
  });

  it("does not double count overlapping covers", () => {
    const covers = [
      { x: 0, y: 0, width: 6, height: 10 },
      { x: 4, y: 0, width: 6, height: 10 },
    ];
    expect(coverageByUnion(target, covers)).toBeCloseTo(1);
  });

  it("returns zero when nothing overlaps", () => {
    expect(coverageByUnion(target, [{ x: 20, y: 20, width: 1, height: 1 }])).toBe(0);
  });
});

describe("transforms", () => {
  it("maps detector-space boxes back to canonical pixels", () => {
    const transform = resizeTransform({ width: 1000, height: 500 }, { width: 500, height: 250 });
    expect(toCanonical({ x: 10, y: 20, width: 30, height: 40 }, transform)).toEqual({
      x: 20,
      y: 40,
      width: 60,
      height: 80,
    });
  });

  it("unions boxes", () => {
    expect(
      unionBoxes([
        { x: 0, y: 0, width: 1, height: 1 },
        { x: 5, y: 5, width: 2, height: 2 },
      ]),
    ).toEqual({ x: 0, y: 0, width: 7, height: 7 });
  });
});
