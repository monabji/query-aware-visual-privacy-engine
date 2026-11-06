import {
  MASK_COLOR,
  detectFormat,
  readPngHeader,
  unexpectedPngChunks,
  verifyOpaqueMasks,
  type MaskPlan,
} from "@qavpe/core";

/**
 * Opaque masking and clean encoding on a fresh raster, followed by checks on
 * the re-decoded bytes — the same bytes a preview would show.
 */

export type CleanArtifact = {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly width: number;
  readonly height: number;
};

export type ArtifactCheck = {
  readonly formatIsPng: boolean;
  readonly dimensionsMatch: boolean;
  readonly unexpectedChunks: readonly string[];
  readonly failingMaskBoxes: number;
  readonly nonOpaquePixels: number;
  readonly passed: boolean;
};

/** Draw source pixels onto a new opaque canvas and fill every planned box. */
export function renderMasked(source: HTMLCanvasElement, plan: MaskPlan): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("2D context unavailable");
  ctx.drawImage(source, 0, 0);
  ctx.fillStyle = `rgb(${MASK_COLOR.r}, ${MASK_COLOR.g}, ${MASK_COLOR.b})`;
  for (const box of plan.boxes) ctx.fillRect(box.x, box.y, box.width, box.height);
  return canvas;
}

export async function encodePng(canvas: HTMLCanvasElement): Promise<CleanArtifact> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))), "image/png"),
  );
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height };
}

/** Decode the artifact bytes again and read raw pixels without colour management. */
export async function decodeArtifact(artifact: CleanArtifact): Promise<{ canvas: HTMLCanvasElement; pixels: Uint8ClampedArray }> {
  const bitmap = await createImageBitmap(new Blob([artifact.bytes], { type: "image/png" }), {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none",
  });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D context unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { canvas, pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
}

export async function checkArtifact(artifact: CleanArtifact, plan: MaskPlan): Promise<ArtifactCheck> {
  const formatIsPng = detectFormat(artifact.bytes) === "png";
  const header = formatIsPng ? readPngHeader(artifact.bytes) : null;
  const dimensionsMatch = header?.width === plan.imageSize.width && header.height === plan.imageSize.height;
  const unexpectedChunks = formatIsPng ? unexpectedPngChunks(artifact.bytes) : ["NOT_PNG"];
  const { pixels } = await decodeArtifact(artifact);
  const failingMaskBoxes = verifyOpaqueMasks(pixels, plan.imageSize, plan.boxes).length;
  let nonOpaquePixels = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) nonOpaquePixels += 1;
  return {
    formatIsPng,
    dimensionsMatch,
    unexpectedChunks,
    failingMaskBoxes,
    nonOpaquePixels,
    passed: formatIsPng && dimensionsMatch && unexpectedChunks.length === 0 && failingMaskBoxes === 0 && nonOpaquePixels === 0,
  };
}
