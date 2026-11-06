import { boxToPolygon, type Region } from "@qavpe/core";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { StageError, timed, type AdapterInfo, type Backend, type LoadReport, type LocalAdapter } from "./types.js";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

export const MEDIAPIPE_FACE_INFO: AdapterInfo = {
  stage: "face_detection",
  id: "mediapipe-blazeface-short-range",
  model: "BlazeFace short-range (float16)",
  revision: "@mediapipe/tasks-vision@1.1.1; model path version 1",
  runtime: "MediaPipe Tasks Vision (WebAssembly; GPU or CPU delegate)",
  license: "Apache-2.0",
  assetHosts: ["storage.googleapis.com"],
};

/** Face detection. Boxes are tight face crops and need conservative expansion before masking. */
export class MediaPipeFaceAdapter implements LocalAdapter<HTMLCanvasElement, Region[]> {
  readonly info = MEDIAPIPE_FACE_INFO;
  private detector: FaceDetector | null = null;

  constructor(private readonly minConfidence = 0.5) {}

  async load(preferred: Backend): Promise<LoadReport> {
    const delegate = preferred === "webgpu" || preferred === "gpu-delegate" ? "GPU" : "CPU";
    const { ms } = await timed(async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks("/vendor/mediapipe-wasm");
        this.detector = await FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "IMAGE",
          minDetectionConfidence: this.minConfidence,
        });
      } catch (cause) {
        throw new StageError("face_detection", "MODEL_LOAD_FAILED", { cause });
      }
    });
    return { backend: delegate === "GPU" ? "gpu-delegate" : "cpu-delegate", loadMs: ms };
  }

  async run(canvas: HTMLCanvasElement): Promise<Region[]> {
    if (!this.detector) throw new StageError("face_detection", "NOT_LOADED");
    let detections;
    try {
      detections = this.detector.detect(canvas).detections;
    } catch (cause) {
      throw new StageError("face_detection", "INFERENCE_FAILED", { cause });
    }
    return detections.flatMap((detection, index) => {
      const box = detection.boundingBox;
      if (!box) return [];
      const bounds = { x: box.originX, y: box.originY, width: box.width, height: box.height };
      const score = detection.categories[0]?.score;
      return [
        {
          id: `face-${index}`,
          kind: "sensitive" as const,
          category: "face",
          polygon: boxToPolygon(bounds),
          bounds,
          ...(score === undefined ? {} : { confidence: score }),
          source: this.info.id,
        },
      ];
    });
  }

  async dispose(): Promise<void> {
    this.detector?.close();
    this.detector = null;
  }
}
