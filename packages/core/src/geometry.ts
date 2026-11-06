/**
 * Geometry in canonical image coordinates.
 *
 * Canonical coordinates are pixels of the decoded image after orientation
 * normalization, origin top-left, x to the right, y downward. Every detector
 * result is mapped into this space before policy or masking.
 */

export type Point = { readonly x: number; readonly y: number };

export type Polygon = readonly Point[];

/** Axis-aligned box; `x`, `y` is the top-left corner. Width/height are non-negative. */
export type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type Size = { readonly width: number; readonly height: number };

export class GeometryError extends Error {
  override readonly name = "GeometryError";
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new GeometryError(`${label} must be a finite number`);
  }
}

export function assertValidSize(size: Size): void {
  assertFinite(size.width, "width");
  assertFinite(size.height, "height");
  if (size.width <= 0 || size.height <= 0) {
    throw new GeometryError("image size must be positive");
  }
}

export function assertValidBox(box: Box): void {
  assertFinite(box.x, "box.x");
  assertFinite(box.y, "box.y");
  assertFinite(box.width, "box.width");
  assertFinite(box.height, "box.height");
  if (box.width < 0 || box.height < 0) {
    throw new GeometryError("box dimensions must be non-negative");
  }
}

export function boxArea(box: Box): number {
  return box.width * box.height;
}

export function boxToPolygon(box: Box): Polygon {
  return [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ];
}

export function polygonBounds(polygon: Polygon): Box {
  if (polygon.length === 0) {
    throw new GeometryError("polygon must contain at least one point");
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of polygon) {
    assertFinite(point.x, "point.x");
    assertFinite(point.y, "point.y");
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Smallest box containing every input box. */
export function unionBoxes(boxes: readonly Box[]): Box {
  if (boxes.length === 0) {
    throw new GeometryError("union requires at least one box");
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of boxes) {
    assertValidBox(box);
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function intersectBoxes(a: Box, b: Box): Box | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** Clip a box to the image; returns null when nothing remains inside. */
export function clipBox(box: Box, size: Size): Box | null {
  assertValidBox(box);
  assertValidSize(size);
  return intersectBoxes(box, { x: 0, y: 0, width: size.width, height: size.height });
}

/**
 * Expand a box conservatively. The margin is the larger of an absolute pixel
 * value and a fraction of the box's shorter side, then clipped to the image.
 */
export function expandBox(
  box: Box,
  size: Size,
  margin: { readonly pixels: number; readonly fractionOfShortSide: number },
): Box | null {
  assertValidBox(box);
  if (margin.pixels < 0 || margin.fractionOfShortSide < 0) {
    throw new GeometryError("margins must be non-negative");
  }
  const pad = Math.max(margin.pixels, Math.min(box.width, box.height) * margin.fractionOfShortSide);
  return clipBox(
    { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad },
    size,
  );
}

/** Round outward to whole pixels so masks never under-cover fractional edges. */
export function toPixelBox(box: Box): Box {
  const x = Math.floor(box.x);
  const y = Math.floor(box.y);
  return {
    x,
    y,
    width: Math.ceil(box.x + box.width) - x,
    height: Math.ceil(box.y + box.height) - y,
  };
}

/**
 * Fraction of `target` covered by `cover` (intersection area / target area).
 * Used to score whether a mask adequately covers an annotated region.
 */
export function coverageOf(target: Box, cover: Box): number {
  const area = boxArea(target);
  if (area === 0) return 0;
  const overlap = intersectBoxes(target, cover);
  return overlap ? boxArea(overlap) / area : 0;
}

/** Fraction of `target` covered by the union of several boxes, computed exactly on a grid of edges. */
export function coverageByUnion(target: Box, covers: readonly Box[]): number {
  const area = boxArea(target);
  if (area === 0) return 0;
  const clipped = covers
    .map((cover) => intersectBoxes(target, cover))
    .filter((box): box is Box => box !== null);
  if (clipped.length === 0) return 0;
  const xs = [...new Set(clipped.flatMap((b) => [b.x, b.x + b.width]))].sort((a, b) => a - b);
  const ys = [...new Set(clipped.flatMap((b) => [b.y, b.y + b.height]))].sort((a, b) => a - b);
  let covered = 0;
  for (let i = 0; i < xs.length - 1; i += 1) {
    for (let j = 0; j < ys.length - 1; j += 1) {
      const cx = ((xs[i] as number) + (xs[i + 1] as number)) / 2;
      const cy = ((ys[j] as number) + (ys[j + 1] as number)) / 2;
      const inside = clipped.some(
        (b) => cx >= b.x && cx <= b.x + b.width && cy >= b.y && cy <= b.y + b.height,
      );
      if (inside) {
        covered += ((xs[i + 1] as number) - (xs[i] as number)) * ((ys[j + 1] as number) - (ys[j] as number));
      }
    }
  }
  return covered / area;
}

/**
 * Linear mapping between a detector's input space and canonical image space,
 * for resize-with-optional-letterbox preprocessing.
 */
export type ScaleTransform = {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly offsetX: number;
  readonly offsetY: number;
};

/** Transform that maps canonical pixels into a resized detector input of `target` size. */
export function resizeTransform(source: Size, target: Size): ScaleTransform {
  assertValidSize(source);
  assertValidSize(target);
  return {
    scaleX: target.width / source.width,
    scaleY: target.height / source.height,
    offsetX: 0,
    offsetY: 0,
  };
}

/** Map a box from detector input space back into canonical image space. */
export function toCanonical(box: Box, transform: ScaleTransform): Box {
  assertValidBox(box);
  if (transform.scaleX <= 0 || transform.scaleY <= 0) {
    throw new GeometryError("transform scales must be positive");
  }
  return {
    x: (box.x - transform.offsetX) / transform.scaleX,
    y: (box.y - transform.offsetY) / transform.scaleY,
    width: box.width / transform.scaleX,
    height: box.height / transform.scaleY,
  };
}
