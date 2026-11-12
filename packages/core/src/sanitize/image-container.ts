/**
 * Byte-level inspection of encoded image containers.
 *
 * Used on the final encoded artifact to confirm it carries only the chunks a
 * clean raster needs, and on inputs to report which metadata the original
 * contained (never its values).
 */

export type ContainerFormat = "png" | "jpeg" | "unknown";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** PNG chunks permitted in a clean outgoing artifact. Everything else is a finding. */
export const CLEAN_PNG_CHUNKS: ReadonlySet<string> = new Set(["IHDR", "IDAT", "IEND", "sRGB", "gAMA", "cHRM", "pHYs"]);

export function detectFormat(bytes: Uint8Array): ContainerFormat {
  if (PNG_SIGNATURE.every((value, index) => bytes[index] === value)) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  return "unknown";
}

export type PngChunk = { readonly type: string; readonly length: number };

export function listPngChunks(bytes: Uint8Array): PngChunk[] {
  if (detectFormat(bytes) !== "png") throw new TypeError("not a PNG file");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: PngChunk[] = [];
  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (offset + 12 + length > bytes.length) throw new RangeError("truncated PNG chunk");
    chunks.push({ type, length });
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return chunks;
}

export type PngHeader = {
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  /** 2 = RGB, 6 = RGBA, others per the PNG specification. */
  readonly colorType: number;
};

export function readPngHeader(bytes: Uint8Array): PngHeader {
  const chunks = listPngChunks(bytes);
  if (chunks[0]?.type !== "IHDR") throw new RangeError("PNG must start with IHDR");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const data = PNG_SIGNATURE.length + 8;
  return {
    width: view.getUint32(data),
    height: view.getUint32(data + 4),
    bitDepth: bytes[data + 8] as number,
    colorType: bytes[data + 9] as number,
  };
}

/** Names of PNG chunks that are not on the clean allowlist (e.g. tEXt, eXIf, iTXt). */
export function unexpectedPngChunks(bytes: Uint8Array): string[] {
  return [...new Set(listPngChunks(bytes).map((chunk) => chunk.type).filter((type) => !CLEAN_PNG_CHUNKS.has(type)))];
}

/**
 * JPEG metadata segment labels found in a file (e.g. "EXIF", "XMP", "COM").
 * Reports presence only, not content.
 */
export function jpegMetadataSegments(bytes: Uint8Array): string[] {
  if (detectFormat(bytes) !== "jpeg") throw new TypeError("not a JPEG file");
  const found = new Set<string>();
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1] as number;
    if (marker === 0xda || marker === 0xd9) break; // start of scan / end of image
    const length = ((bytes[offset + 2] as number) << 8) | (bytes[offset + 3] as number);
    const body = bytes.subarray(offset + 4, Math.min(bytes.length, offset + 2 + length));
    const ascii = String.fromCharCode(...body.subarray(0, 32));
    if (marker === 0xe1 && ascii.startsWith("Exif")) found.add("EXIF");
    else if (marker === 0xe1 && ascii.includes("ns.adobe.com/xap")) found.add("XMP");
    else if (marker === 0xed) found.add("IPTC");
    else if (marker === 0xe2 && ascii.startsWith("ICC_PROFILE")) found.add("ICC");
    else if (marker === 0xfe) found.add("COM");
    else if (marker >= 0xe2 && marker <= 0xef) found.add(`APP${marker - 0xe0}`);
    offset += 2 + length;
  }
  return [...found].sort();
}

/**
 * Read the EXIF orientation tag (1–8) from a JPEG, or 1 when absent.
 * Needed so detections and masks are computed on upright pixels.
 */
export function jpegExifOrientation(bytes: Uint8Array): number {
  if (detectFormat(bytes) !== "jpeg") return 1;
  let offset = 2;
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1] as number;
    if (marker === 0xda) break;
    const length = ((bytes[offset + 2] as number) << 8) | (bytes[offset + 3] as number);
    if (marker === 0xe1 && String.fromCharCode(...bytes.subarray(offset + 4, offset + 8)) === "Exif") {
      const tiff = offset + 10;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const little = view.getUint16(tiff) === 0x4949;
      const ifd = tiff + view.getUint32(tiff + 4, little);
      const entries = view.getUint16(ifd, little);
      for (let i = 0; i < entries; i += 1) {
        const entry = ifd + 2 + i * 12;
        if (entry + 12 > bytes.length) break;
        if (view.getUint16(entry, little) === 0x0112) {
          const value = view.getUint16(entry + 8, little);
          return value >= 1 && value <= 8 ? value : 1;
        }
      }
      return 1;
    }
    offset += 2 + length;
  }
  return 1;
}
