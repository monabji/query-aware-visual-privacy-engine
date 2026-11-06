import {
  findSensitiveText,
  maskedAreaFraction,
  parseQueryIntent,
  planMasks,
  groundTextField,
  sensitiveTextRegions,
  summarizeTimings,
  type MaskMargin,
  type OcrResult,
  type Region,
  type StageName,
} from "@qavpe/core";
import { PILOT_SCENES, PILOT_SCENES_VERSION, renderScene, type RenderedScene, type SceneSpec } from "@qavpe/pilot";
import { MediaPipeFaceAdapter } from "./adapters/face-mediapipe.js";
import { OwlVitGroundingAdapter } from "./adapters/grounding-owlvit.js";
import { BertNerAdapter } from "./adapters/ner-transformers.js";
import { TesseractOcrAdapter } from "./adapters/ocr-tesseract.js";
import { StageError, timed, type Backend, type LocalAdapter, type ProgressListener } from "./adapters/types.js";
import { describeEnvironment } from "./measure/environment.js";
import { sampleMemory } from "./measure/memory.js";
import { blockedRequests, cspViolations, summarizeResources } from "./measure/network-audit.js";
import { checkArtifact, decodeArtifact, encodePng, renderMasked, type ArtifactCheck } from "./pipeline/clean-artifact.js";
import { evaluateMasks, evaluateQuestion, type SceneEvaluation } from "./pipeline/evaluate.js";
import { REPORT_VERSION, type AdapterLoadResult, type FeasibilityReport, type StageTiming } from "./report.js";

declare const __HARNESS_REVISION__: string;

/** Provisional face margin: BlazeFace boxes are tight around facial features. */
export const FACE_MARGIN: MaskMargin = { pixels: 4, fractionOfShortSide: 0.25 };

/** Visual grounding prompts for text-bearing objects; exploratory only. */
export const VISUAL_GROUNDING_LABELS = ["medicine package", "paper label", "printed text"] as const;

export type Log = (line: string) => void;

export type Analysis = {
  readonly ocr: OcrResult | null;
  readonly sensitive: Region[];
  readonly statuses: Partial<Record<StageName, { state: "complete" | "failed"; reasonCode?: string }>>;
  readonly stageMs: Partial<Record<string, number>>;
};

export class FeasibilityRunner {
  readonly ocr = new TesseractOcrAdapter();
  readonly ner = new BertNerAdapter();
  readonly faces = new MediaPipeFaceAdapter();
  readonly grounding = new OwlVitGroundingAdapter();
  private loadResults: AdapterLoadResult[] = [];
  private readonly memory: Array<Awaited<ReturnType<typeof sampleMemory>> & { at: string }> = [];
  private preferred: Backend = "wasm";

  constructor(private readonly log: Log) {}

  private get adapters(): LocalAdapter<never, unknown>[] {
    return [this.ocr, this.ner, this.faces, this.grounding] as unknown as LocalAdapter<never, unknown>[];
  }

  isLoaded(id: string): boolean {
    return this.loadResults.some((r) => r.info.id === id && r.status === "loaded");
  }

  async recordMemory(at: string): Promise<void> {
    this.memory.push({ ...(await sampleMemory()), at });
  }

  async loadAll(preferred: Backend, onProgress?: ProgressListener): Promise<void> {
    this.preferred = preferred;
    await this.recordMemory("before-load");
    this.loadResults = [];
    for (const adapter of this.adapters) {
      this.log(`Loading ${adapter.info.id} (${preferred})…`);
      try {
        const load = await adapter.load(preferred, onProgress);
        this.loadResults.push({ info: adapter.info, status: "loaded", load });
        this.log(`Loaded ${adapter.info.id} on ${load.backend} in ${load.loadMs.toFixed(0)} ms`);
      } catch (error) {
        const reasonCode = error instanceof StageError ? error.reasonCode : "MODEL_LOAD_FAILED";
        this.loadResults.push({ info: adapter.info, status: "failed", reasonCode });
        this.log(`FAILED ${adapter.info.id}: ${reasonCode}`);
        // Developer diagnostics stay in the local console; reports keep only the reason code.
        console.error(error, error instanceof Error ? error.cause : undefined);
      }
    }
    await this.recordMemory("after-load");
  }

  /** Run every mandatory local stage on one canvas. Any failure is recorded, never skipped silently. */
  async analyze(canvas: HTMLCanvasElement): Promise<Analysis> {
    const statuses: Analysis["statuses"] = {};
    const stageMs: Analysis["stageMs"] = {};
    let ocr: OcrResult | null = null;
    const sensitive: Region[] = [];

    const attempt = async <T>(stage: StageName, key: string, work: () => Promise<T>): Promise<T | null> => {
      try {
        const { value, ms } = await timed(work);
        stageMs[key] = ms;
        statuses[stage] = { state: "complete" };
        return value;
      } catch (error) {
        statuses[stage] = { state: "failed", reasonCode: error instanceof StageError ? error.reasonCode : "UNKNOWN" };
        console.error(error, error instanceof Error ? error.cause : undefined);
        return null;
      }
    };

    ocr = await attempt("ocr", "ocr", () => this.ocr.run(canvas));
    if (ocr) {
      const currentOcr = ocr;
      const patterns = await attempt("sensitive_text", "patterns", async () => sensitiveTextRegions(currentOcr));
      const ner = await attempt("sensitive_text", "ner", () => this.ner.run(currentOcr));
      if (patterns) sensitive.push(...patterns);
      if (ner) sensitive.push(...ner);
      if (!patterns || !ner) statuses.sensitive_text = { state: "failed", reasonCode: "DETECTOR_FAILED" };
    } else {
      statuses.sensitive_text = { state: "failed", reasonCode: "OCR_UNAVAILABLE" };
    }
    const faces = await attempt("face_detection", "faces", () => this.faces.run(canvas));
    if (faces) sensitive.push(...faces);
    return { ocr, sensitive, statuses, stageMs };
  }

  planFor(analysis: Analysis, size: { width: number; height: number }) {
    const text = analysis.sensitive.filter((r) => r.category !== "face");
    const faces = analysis.sensitive.filter((r) => r.category === "face");
    const textPlan = planMasks(text, size);
    const facePlan = planMasks(faces, size, FACE_MARGIN);
    return { ...textPlan, boxes: [...textPlan.boxes, ...facePlan.boxes], regionIds: [...textPlan.regionIds, ...facePlan.regionIds] };
  }

  async runPilot(repeats: number, signal: AbortSignal, onScene?: (scene: SceneSpec, canvas: HTMLCanvasElement, artifact: HTMLCanvasElement) => void): Promise<FeasibilityReport> {
    const timingSamples = new Map<string, { stage: StageName; adapterId: string; first: number | null; warm: number[] }>();
    const sample = (key: string, stage: StageName, adapterId: string, ms: number | undefined, first: boolean) => {
      if (ms === undefined) return;
      const entry = timingSamples.get(key) ?? { stage, adapterId, first: null, warm: [] };
      if (first && entry.first === null) entry.first = ms;
      else entry.warm.push(ms);
      timingSamples.set(key, entry);
    };

    const scenes: SceneEvaluation[] = [];
    const artifactChecks: Array<ArtifactCheck & { sceneId: string; residualSensitiveFindings: number; maskedAreaFraction: number }> = [];
    let firstScene = true;

    for (const scene of PILOT_SCENES) {
      if (signal.aborted) break;
      this.log(`Scene ${scene.id}`);
      const canvas = document.createElement("canvas");
      canvas.width = scene.width;
      canvas.height = scene.height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("2D context unavailable");
      const rendered: RenderedScene = renderScene(ctx, scene);

      let analysis: Analysis | null = null;
      for (let rep = 0; rep < Math.max(1, repeats); rep += 1) {
        const result = await this.analyze(canvas);
        for (const [stage, status] of Object.entries(result.statuses)) {
          if (status.state !== "complete") this.log(`  stage ${stage} failed: ${status.reasonCode ?? "UNKNOWN"}`);
        }
        const first = firstScene && rep === 0;
        sample("ocr", "ocr", this.ocr.info.id, result.stageMs.ocr, first);
        sample("patterns", "sensitive_text", "sensitive-patterns@1", result.stageMs.patterns, first);
        sample("ner", "sensitive_text", this.ner.info.id, result.stageMs.ner, first);
        sample("faces", "face_detection", this.faces.info.id, result.stageMs.faces, first);
        analysis ??= result;
      }
      if (!analysis) continue;

      const plan = this.planFor(analysis, { width: canvas.width, height: canvas.height });
      const masks = evaluateMasks(rendered, plan);

      let visual: Region[] | null = null;
      if (this.isLoaded(this.grounding.info.id)) {
        try {
          const { value, ms } = await timed(() => this.grounding.run({ canvas, labels: VISUAL_GROUNDING_LABELS }));
          sample("owlvit", "query_grounding", this.grounding.info.id, ms, firstScene);
          visual = value;
        } catch (error) {
          this.log(`Visual grounding failed: ${error instanceof StageError ? error.reasonCode : "UNKNOWN"}`);
        }
      }

      const questions = scene.questions.map((question) => {
        const intent = parseQueryIntent(question.question);
        const target = intent.task === "read_text_field" ? intent.target : null;
        const grounded = target && analysis.ocr ? groundTextField(analysis.ocr, target) : [];
        return evaluateQuestion(rendered, question, target, grounded, plan, visual);
      });

      const falsePositiveFaces = analysis.sensitive.filter((r) => r.category === "face").length;
      scenes.push({ sceneId: scene.id, tags: scene.tags, ...masks, falsePositiveFaces, questions });

      const { value: artifactCanvas, ms: maskMs } = await timed(async () => renderMasked(canvas, plan));
      const { value: artifact, ms: encodeMs } = await timed(() => encodePng(artifactCanvas));
      sample("mask", "encode", "canvas-opaque-fill", maskMs, firstScene);
      sample("encode", "encode", "canvas-png", encodeMs, firstScene);
      const { value: check, ms: checkMs } = await timed(() => checkArtifact(artifact, plan));
      sample("check", "output_check", "artifact-check@1", checkMs, firstScene);

      // Residual check: OCR the decoded artifact and count readable private
      // values. Field-label matches are excluded because a masked value leaves
      // its label behind by design. Same OCR engine as the sanitizer, so this
      // is a weak, correlated check.
      let residual = -1;
      try {
        const decoded = await decodeArtifact(artifact);
        const reOcr = await this.ocr.run(decoded.canvas);
        residual = findSensitiveText(reOcr).filter((match) => match.mechanism === "value_pattern").length;
      } catch {
        residual = -1;
      }
      artifactChecks.push({ ...check, sceneId: scene.id, residualSensitiveFindings: residual, maskedAreaFraction: maskedAreaFraction(plan) });
      onScene?.(scene, canvas, artifactCanvas);
      firstScene = false;
    }
    await this.recordMemory("after-pilot");

    const timings: StageTiming[] = [...timingSamples.values()].map((entry) => ({
      stage: entry.stage,
      adapterId: entry.adapterId,
      firstRunMs: entry.first,
      warm: entry.warm.length > 0 ? summarizeTimings(entry.warm) : null,
    }));
    return this.buildReport(timings, { scenesVersion: PILOT_SCENES_VERSION, repeats, scenes, artifactChecks });
  }

  async buildReport(timings: StageTiming[], pilot: FeasibilityReport["pilot"]): Promise<FeasibilityReport> {
    return {
      reportVersion: REPORT_VERSION,
      generatedAt: new Date().toISOString(),
      harnessRevision: __HARNESS_REVISION__,
      preferredBackend: this.preferred,
      environment: await describeEnvironment(),
      adapters: this.loadResults,
      timings,
      pilot,
      memory: this.memory,
      network: { resources: summarizeResources(), blockedRequests: blockedRequests(), cspViolations: cspViolations() },
    };
  }

  async dispose(): Promise<void> {
    for (const adapter of this.adapters) await adapter.dispose();
    this.loadResults = [];
  }
}
