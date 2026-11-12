import { describe, expect, it } from "vitest";
import type { Region } from "../src/contracts.js";
import { boxToPolygon } from "../src/geometry.js";
import { maskedAreaFraction, planMasks, verifyOpaqueMasks } from "../src/sanitize/mask-plan.js";

function region(id: string, x: number, y: number, width: number, height: number): Region {
  const bounds = { x, y, width, height };
  return { id, kind: "sensitive", category: "person_name", polygon: boxToPolygon(bounds), bounds, source: "test" };
}

const size = { width: 20, height: 10 };

describe("planMasks", () => {
  it("expands, rounds outward and clips to whole pixels", () => {
    const plan = planMasks([region("a", 1.5, 1.5, 4, 2)], size, { pixels: 1, fractionOfShortSide: 0 });
    expect(plan.boxes).toEqual([{ x: 0, y: 0, width: 7, height: 5 }]);
    expect(plan.regionIds).toEqual(["a"]);
  });

  it("drops regions entirely outside the image", () => {
    expect(planMasks([region("b", 50, 50, 2, 2)], size).boxes).toEqual([]);
  });
});

describe("verifyOpaqueMasks", () => {
  function image(fill: number): Uint8ClampedArray {
    const pixels = new Uint8ClampedArray(size.width * size.height * 4).fill(fill);
    return pixels;
  }

  function paint(pixels: Uint8ClampedArray, box: { x: number; y: number; width: number; height: number }): void {
    for (let y = box.y; y < box.y + box.height; y += 1) {
      for (let x = box.x; x < box.x + box.width; x += 1) {
        const o = (y * size.width + x) * 4;
        pixels.set([0, 0, 0, 255], o);
      }
    }
  }

  it("passes when every masked pixel is opaque mask colour", () => {
    const box = { x: 2, y: 2, width: 3, height: 3 };
    const pixels = image(200);
    paint(pixels, box);
    expect(verifyOpaqueMasks(pixels, size, [box])).toEqual([]);
  });

  it("flags a box with a single surviving original pixel", () => {
    const box = { x: 2, y: 2, width: 3, height: 3 };
    const pixels = image(200);
    paint(pixels, box);
    pixels.set([10, 0, 0, 255], (4 * size.width + 4) * 4);
    expect(verifyOpaqueMasks(pixels, size, [box])).toEqual([0]);
  });

  it("rejects buffers that do not match the image size", () => {
    expect(() => verifyOpaqueMasks(new Uint8ClampedArray(4), size, [])).toThrow(RangeError);
  });
});

describe("maskedAreaFraction", () => {
  it("counts overlapping masks once", () => {
    const plan = {
      version: "t",
      imageSize: size,
      regionIds: ["a", "b"],
      boxes: [
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 0, width: 10, height: 10 },
      ],
    };
    expect(maskedAreaFraction(plan)).toBeCloseTo(0.75);
  });
});
