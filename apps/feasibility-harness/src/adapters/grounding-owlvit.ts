import { boxToPolygon, clipBox, type Region } from "@qavpe/core";
import { pipeline, RawImage, type ZeroShotObjectDetectionPipeline } from "@huggingface/transformers";
import { configureTransformers } from "./transformers-runtime.js";
import { StageError, timed, type AdapterInfo, type Backend, type LoadReport, type LocalAdapter, type ProgressListener } from "./types.js";

const MODEL_ID = "Xenova/owlvit-base-patch32";
const REVISION = "b75f4e52949639c3bb0b96546ea4149482f6e7ef";

export const OWLVIT_INFO: AdapterInfo = {
  stage: "query_grounding",
  id: "owlvit-base-patch32",
  model: MODEL_ID,
  revision: REVISION,
  runtime: "Transformers.js 4.3.1 / ONNX Runtime Web",
  license: "Apache-2.0 (upstream google/owlvit-base-patch32; ONNX repo card declares none — verify before release)",
  assetHosts: ["huggingface.co", "*.hf.co"],
};

export type GroundingInput = { readonly canvas: HTMLCanvasElement; readonly labels: readonly string[] };

/** Open-vocabulary object grounding for visual targets (e.g. "medicine box"). Relevance only. */
export class OwlVitGroundingAdapter implements LocalAdapter<GroundingInput, Region[]> {
  readonly info = OWLVIT_INFO;
  private detector: ZeroShotObjectDetectionPipeline | null = null;

  constructor(private readonly threshold = 0.1, private readonly topK = 5) {}

  async load(preferred: Backend, onProgress?: ProgressListener): Promise<LoadReport> {
    configureTransformers();
    const device = preferred === "webgpu" ? "webgpu" : "wasm";
    const { ms } = await timed(async () => {
      try {
        this.detector = (await pipeline("zero-shot-object-detection", MODEL_ID, {
          revision: REVISION,
          device,
          dtype: device === "webgpu" ? "fp32" : "q8",
          progress_callback: (event: { status: string; progress?: number; file?: string }) =>
            onProgress?.(event.progress === undefined ? null : event.progress / 100, event.status),
        })) as ZeroShotObjectDetectionPipeline;
      } catch (cause) {
        throw new StageError("query_grounding", "MODEL_LOAD_FAILED", { cause });
      }
    });
    return { backend: device, loadMs: ms };
  }

  async run({ canvas, labels }: GroundingInput): Promise<Region[]> {
    if (!this.detector) throw new StageError("query_grounding", "NOT_LOADED");
    let output;
    try {
      output = await this.detector(RawImage.fromCanvas(canvas), [...labels], {
        threshold: this.threshold,
        top_k: this.topK,
        percentage: false,
      });
    } catch (cause) {
      throw new StageError("query_grounding", "INFERENCE_FAILED", { cause });
    }
    const size = { width: canvas.width, height: canvas.height };
    return output.flatMap((detection, index) => {
      const bounds = clipBox(
        {
          x: detection.box.xmin,
          y: detection.box.ymin,
          width: detection.box.xmax - detection.box.xmin,
          height: detection.box.ymax - detection.box.ymin,
        },
        size,
      );
      if (!bounds) return [];
      return [
        {
          id: `owl-${index}`,
          kind: "relevant" as const,
          category: detection.label,
          polygon: boxToPolygon(bounds),
          bounds,
          confidence: detection.score,
          source: this.info.id,
        },
      ];
    });
  }

  async dispose(): Promise<void> {
    await this.detector?.dispose();
    this.detector = null;
  }
}
