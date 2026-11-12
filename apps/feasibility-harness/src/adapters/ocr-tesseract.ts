import type { OcrLine, OcrResult } from "@qavpe/core";
import { createWorker, OEM, PSM, type Worker } from "tesseract.js";
import { StageError, timed, type AdapterInfo, type Backend, type LoadReport, type LocalAdapter, type ProgressListener } from "./types.js";

export const TESSERACT_INFO: AdapterInfo = {
  stage: "ocr",
  id: "tesseract-js",
  model: "tesseract eng LSTM (4.0.0_best_int)",
  revision: "tesseract.js@7.0.0; tesseract.js-core@7.0.0; @tesseract.js-data/eng@4.0.0_best_int",
  runtime: "Tesseract compiled to WebAssembly, in a dedicated worker",
  license: "Apache-2.0 (engine and eng traineddata)",
  assetHosts: ["cdn.jsdelivr.net"],
};

/** OCR in a Web Worker. Engine and worker code are served from this origin; only language data is fetched. */
export class TesseractOcrAdapter implements LocalAdapter<HTMLCanvasElement, OcrResult> {
  readonly info = TESSERACT_INFO;
  private worker: Worker | null = null;

  constructor(private readonly pageSegMode: PSM = PSM.AUTO) {}

  async load(_preferred: Backend, onProgress?: ProgressListener): Promise<LoadReport> {
    const { ms } = await timed(async () => {
      try {
        this.worker = await createWorker("eng", OEM.LSTM_ONLY, {
          workerPath: "/vendor/tesseract-worker/worker.min.js",
          corePath: "/vendor/tesseract-core/",
          workerBlobURL: false,
          logger: (message) => onProgress?.(message.progress, message.status),
        });
        await this.worker.setParameters({ tessedit_pageseg_mode: this.pageSegMode, preserve_interword_spaces: "0" });
      } catch (cause) {
        throw new StageError("ocr", "MODEL_LOAD_FAILED", { cause });
      }
    });
    return { backend: "wasm", loadMs: ms };
  }

  async run(canvas: HTMLCanvasElement): Promise<OcrResult> {
    if (!this.worker) throw new StageError("ocr", "NOT_LOADED");
    let page;
    try {
      ({ data: page } = await this.worker.recognize(canvas, {}, { blocks: true, text: false }));
    } catch (cause) {
      throw new StageError("ocr", "INFERENCE_FAILED", { cause });
    }
    const lines: OcrLine[] = [];
    for (const block of page.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          const words = line.words
            .filter((word) => word.text.trim().length > 0)
            .map((word) => ({
              text: word.text,
              confidence: word.confidence / 100,
              bounds: { x: word.bbox.x0, y: word.bbox.y0, width: word.bbox.x1 - word.bbox.x0, height: word.bbox.y1 - word.bbox.y0 },
            }));
          if (words.length === 0) continue;
          lines.push({
            words,
            bounds: { x: line.bbox.x0, y: line.bbox.y0, width: line.bbox.x1 - line.bbox.x0, height: line.bbox.y1 - line.bbox.y0 },
          });
        }
      }
    }
    return { lines, engine: this.info.id };
  }

  async dispose(): Promise<void> {
    await this.worker?.terminate();
    this.worker = null;
  }
}
