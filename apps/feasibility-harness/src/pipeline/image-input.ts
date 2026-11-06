import { detectFormat, jpegExifOrientation, jpegMetadataSegments, unexpectedPngChunks } from "@qavpe/core";

/**
 * Local image decoding with upright orientation. The file is read into
 * memory and decoded in the browser; nothing is uploaded.
 */

/** Provisional Phase 1 limits; final values are a recorded scope decision (docs/SCOPE.md). */
export const INPUT_LIMITS = {
  maxBytes: 20 * 1024 * 1024,
  maxPixels: 24_000_000,
  maxAnalysisLongSide: 2048,
  formats: ["png", "jpeg"] as const,
};

export type DecodedInput = {
  readonly canvas: HTMLCanvasElement;
  readonly format: "png" | "jpeg";
  readonly exifOrientation: number;
  /** Metadata container kinds present in the original (never values). */
  readonly metadataKinds: readonly string[];
  readonly originalSize: { width: number; height: number };
  /** Analysis canvas scale relative to the upright original. */
  readonly scale: number;
};

export class InputError extends Error {
  override readonly name = "InputError";
  constructor(readonly reasonCode: "UNSUPPORTED_FORMAT" | "FILE_TOO_LARGE" | "TOO_MANY_PIXELS" | "DECODE_FAILED") {
    super(reasonCode);
  }
}

export async function decodeImageFile(file: Blob): Promise<DecodedInput> {
  if (file.size > INPUT_LIMITS.maxBytes) throw new InputError("FILE_TOO_LARGE");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = detectFormat(bytes);
  if (format === "unknown") throw new InputError("UNSUPPORTED_FORMAT");
  const metadataKinds = format === "jpeg" ? jpegMetadataSegments(bytes) : unexpectedPngChunks(bytes);
  const exifOrientation = format === "jpeg" ? jpegExifOrientation(bytes) : 1;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes], { type: `image/${format}` }), { imageOrientation: "from-image" });
  } catch {
    throw new InputError("DECODE_FAILED");
  }
  try {
    if (bitmap.width * bitmap.height > INPUT_LIMITS.maxPixels) throw new InputError("TOO_MANY_PIXELS");
    const scale = Math.min(1, INPUT_LIMITS.maxAnalysisLongSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new InputError("DECODE_FAILED");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return {
      canvas,
      format,
      exifOrientation,
      metadataKinds,
      originalSize: { width: bitmap.width, height: bitmap.height },
      scale,
    };
  } finally {
    bitmap.close();
  }
}
