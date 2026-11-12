import type { Region } from "../contracts.js";
import { expandBox, toPixelBox, type Box, type Size } from "../geometry.js";

/**
 * Opaque mask planning. Produces whole-pixel boxes in canonical coordinates
 * that a renderer fills with a solid colour. Rendering itself is
 * environment-specific (canvas in the browser); planning is pure.
 */

export const MASK_PLAN_VERSION = "mask-plan@1";

export type MaskMargin = { readonly pixels: number; readonly fractionOfShortSide: number };

/** Provisional default; must be validated against labelled examples (see docs/MODEL_AND_EVALUATION.md). */
export const DEFAULT_TEXT_MARGIN: MaskMargin = { pixels: 2, fractionOfShortSide: 0.15 };

/** Opaque fill. RGB only: outputs are flattened with no alpha channel semantics. */
export const MASK_COLOR = { r: 0, g: 0, b: 0 } as const;

export type MaskPlan = {
  readonly version: string;
  readonly imageSize: Size;
  readonly boxes: readonly Box[];
  readonly regionIds: readonly string[];
};

export function planMasks(regions: readonly Region[], imageSize: Size, margin: MaskMargin = DEFAULT_TEXT_MARGIN): MaskPlan {
  const boxes: Box[] = [];
  const regionIds: string[] = [];
  for (const region of regions) {
    const expanded = expandBox(region.bounds, imageSize, margin);
    if (!expanded) continue;
    const pixel = toPixelBox(expanded);
    const clipped = {
      x: Math.max(0, pixel.x),
      y: Math.max(0, pixel.y),
      width: Math.min(imageSize.width, pixel.x + pixel.width) - Math.max(0, pixel.x),
      height: Math.min(imageSize.height, pixel.y + pixel.height) - Math.max(0, pixel.y),
    };
    if (clipped.width > 0 && clipped.height > 0) {
      boxes.push(clipped);
      regionIds.push(region.id);
    }
  }
  return { version: MASK_PLAN_VERSION, imageSize, boxes, regionIds };
}

/**
 * Check a decoded RGBA buffer: every pixel inside each planned box must equal
 * the mask colour and be fully opaque. Returns the indices of failing boxes.
 * Lossy encodings will fail this check by design; masks are verified on the
 * final decoded artifact.
 */
export function verifyOpaqueMasks(
  rgba: Uint8ClampedArray | Uint8Array,
  size: Size,
  boxes: readonly Box[],
  color: { r: number; g: number; b: number } = MASK_COLOR,
): number[] {
  if (rgba.length !== size.width * size.height * 4) {
    throw new RangeError("pixel buffer does not match image size");
  }
  const failing: number[] = [];
  boxes.forEach((box, index) => {
    for (let y = box.y; y < box.y + box.height; y += 1) {
      for (let x = box.x; x < box.x + box.width; x += 1) {
        const offset = (y * size.width + x) * 4;
        if (
          rgba[offset] !== color.r ||
          rgba[offset + 1] !== color.g ||
          rgba[offset + 2] !== color.b ||
          rgba[offset + 3] !== 255
        ) {
          failing.push(index);
          return;
        }
      }
    }
  });
  return failing;
}

/** Fraction of image pixels covered by the plan (secondary diagnostic only). */
export function maskedAreaFraction(plan: MaskPlan): number {
  const { width, height } = plan.imageSize;
  const covered = new Uint8Array(width * height);
  for (const box of plan.boxes) {
    for (let y = box.y; y < box.y + box.height; y += 1) {
      covered.fill(1, y * width + box.x, y * width + box.x + box.width);
    }
  }
  let total = 0;
  for (const value of covered) total += value;
  return total / (width * height);
}
