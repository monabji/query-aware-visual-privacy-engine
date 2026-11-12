import { describe, expect, it } from "vitest";
import {
  detectFormat,
  jpegExifOrientation,
  jpegMetadataSegments,
  listPngChunks,
  readPngHeader,
  unexpectedPngChunks,
} from "../src/sanitize/image-container.js";

function u32(value: number): number[] {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
}

function chunk(type: string, data: number[]): number[] {
  // CRC is not validated by the inspector; zeros keep fixtures simple.
  return [...u32(data.length), ...[...type].map((c) => c.charCodeAt(0)), ...data, 0, 0, 0, 0];
}

function png(extra: number[][] = []): Uint8Array {
  const ihdr = [...u32(3), ...u32(2), 8, 2, 0, 0, 0];
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunk("IHDR", ihdr),
    ...extra.flat(),
    ...chunk("IDAT", [1, 2, 3]),
    ...chunk("IEND", []),
  ]);
}

describe("PNG inspection", () => {
  it("reads the header and chunk list", () => {
    const bytes = png();
    expect(detectFormat(bytes)).toBe("png");
    expect(readPngHeader(bytes)).toEqual({ width: 3, height: 2, bitDepth: 8, colorType: 2 });
    expect(listPngChunks(bytes).map((c) => c.type)).toEqual(["IHDR", "IDAT", "IEND"]);
    expect(unexpectedPngChunks(bytes)).toEqual([]);
  });

  it("flags text and EXIF metadata chunks", () => {
    const bytes = png([chunk("tEXt", [65, 0, 66]), chunk("eXIf", [0])]);
    expect(unexpectedPngChunks(bytes)).toEqual(["tEXt", "eXIf"]);
  });

  it("rejects truncated files", () => {
    expect(() => listPngChunks(png().subarray(0, 20))).toThrow(RangeError);
  });
});

describe("JPEG inspection", () => {
  // SOI, APP1 Exif (little-endian TIFF, one IFD entry: Orientation = 6), COM, SOS
  const exifBody = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF header, IFD at 8
    0x01, 0x00, // one entry
    0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, // 0x0112 SHORT 1 = 6
    0x00, 0x00, 0x00, 0x00, // next IFD
  ];
  const app1 = [0xff, 0xe1, 0x00, exifBody.length + 2, ...exifBody];
  const com = [0xff, 0xfe, 0x00, 0x04, 0x68, 0x69];
  const jpeg = new Uint8Array([0xff, 0xd8, ...app1, ...com, 0xff, 0xda, 0x00, 0x02]);

  it("lists metadata segment kinds without their values", () => {
    expect(jpegMetadataSegments(jpeg)).toEqual(["COM", "EXIF"]);
  });

  it("reads EXIF orientation", () => {
    expect(jpegExifOrientation(jpeg)).toBe(6);
    expect(jpegExifOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1);
  });
});
