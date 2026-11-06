import "./styles.css";
import { blockingStages, groundTextField, parseQueryIntent, reviewQuestion, type Box, type StageName } from "@qavpe/core";
import { webGpuAvailable } from "./adapters/transformers-runtime.js";
import type { Backend } from "./adapters/types.js";
import { installEgressGuard, watchCspViolations } from "./measure/network-audit.js";
import { checkArtifact, encodePng, renderMasked } from "./pipeline/clean-artifact.js";
import { decodeImageFile, InputError } from "./pipeline/image-input.js";
import type { FeasibilityReport } from "./report.js";
import { FeasibilityRunner } from "./runner.js";

installEgressGuard();
watchCspViolations();

const MANDATORY_STAGES: readonly StageName[] = ["ocr", "sensitive_text", "face_detection"];

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`missing #${id}`);
  return found as T;
}

const ui = {
  backend: element<HTMLSelectElement>("backend"),
  load: element<HTMLButtonElement>("load"),
  progress: element<HTMLParagraphElement>("progress"),
  repeats: element<HTMLInputElement>("repeats"),
  runPilot: element<HTMLButtonElement>("run-pilot"),
  cancel: element<HTMLButtonElement>("cancel"),
  scenes: element<HTMLDivElement>("scenes"),
  file: element<HTMLInputElement>("file"),
  question: element<HTMLInputElement>("question"),
  analyze: element<HTMLButtonElement>("analyze"),
  clear: element<HTMLButtonElement>("clear"),
  ownStatus: element<HTMLParagraphElement>("own-status"),
  own: element<HTMLDivElement>("own"),
  download: element<HTMLButtonElement>("download"),
  log: element<HTMLPreElement>("log"),
  report: element<HTMLPreElement>("report"),
};

function log(line: string): void {
  ui.log.textContent += `${new Date().toISOString().slice(11, 19)}  ${line}\n`;
  ui.log.scrollTop = ui.log.scrollHeight;
}

const runner = new FeasibilityRunner(log);
let latestReport: FeasibilityReport | null = null;
let pilotAbort: AbortController | null = null;

function figure(canvas: HTMLCanvasElement, caption: string): HTMLElement {
  const fig = document.createElement("figure");
  const cap = document.createElement("figcaption");
  cap.textContent = caption;
  fig.append(canvas, cap);
  return fig;
}

function outline(source: HTMLCanvasElement, sensitive: readonly Box[], relevant: readonly Box[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(source, 0, 0);
  ctx.lineWidth = Math.max(2, source.width / 400);
  ctx.strokeStyle = "#d62828";
  for (const b of sensitive) ctx.strokeRect(b.x, b.y, b.width, b.height);
  ctx.strokeStyle = "#2a9d3f";
  for (const b of relevant) ctx.strokeRect(b.x, b.y, b.width, b.height);
  return canvas;
}

function showReport(report: FeasibilityReport): void {
  latestReport = report;
  (window as unknown as { __feasibilityReport?: FeasibilityReport }).__feasibilityReport = report;
  ui.report.textContent = JSON.stringify(report, null, 2);
  ui.download.disabled = false;
}

async function resolveBackend(): Promise<Backend> {
  const choice = ui.backend.value;
  if (choice === "webgpu" || choice === "wasm") return choice;
  return (await webGpuAvailable()) ? "webgpu" : "wasm";
}

ui.load.addEventListener("click", async () => {
  ui.load.disabled = true;
  const backend = await resolveBackend();
  await runner.loadAll(backend, (fraction, label) => {
    ui.progress.textContent = fraction === null ? label : `${label} ${(fraction * 100).toFixed(0)}%`;
  });
  ui.progress.textContent = "Model loading finished; see log for per-adapter results.";
  ui.runPilot.disabled = false;
  ui.file.disabled = false;
  ui.question.disabled = false;
  ui.analyze.disabled = false;
  showReport(await runner.buildReport([], null));
});

ui.runPilot.addEventListener("click", async () => {
  ui.runPilot.disabled = true;
  ui.cancel.disabled = false;
  ui.scenes.replaceChildren();
  pilotAbort = new AbortController();
  try {
    const report = await runner.runPilot(Number(ui.repeats.value) || 1, pilotAbort.signal, (scene, original, artifact) => {
      ui.scenes.append(figure(original, `${scene.id} — synthetic input`), figure(artifact, `${scene.id} — clean artifact`));
    });
    showReport(report);
    log("Pilot complete.");
  } catch (error) {
    log("Pilot failed; see console for details.");
    console.error(error);
  } finally {
    ui.runPilot.disabled = false;
    ui.cancel.disabled = true;
    pilotAbort = null;
  }
});

ui.cancel.addEventListener("click", () => {
  pilotAbort?.abort();
  log("Cancel requested; stopping after the current scene.");
});

ui.analyze.addEventListener("click", async () => {
  const file = ui.file.files?.[0];
  if (!file) {
    ui.ownStatus.textContent = "Choose an image first.";
    return;
  }
  ui.analyze.disabled = true;
  ui.own.replaceChildren();
  try {
    const input = await decodeImageFile(file);
    const analysis = await runner.analyze(input.canvas);
    const blocked = blockingStages(
      Object.fromEntries(
        Object.entries(analysis.statuses).map(([stage, status]) => [
          stage,
          status.state === "complete" ? { state: "complete", regionCount: 0 } : { state: "failed", reasonCode: status.reasonCode ?? "UNKNOWN" },
        ]),
      ),
      MANDATORY_STAGES,
    );
    const question = ui.question.value;
    const questionFindings = reviewQuestion(question).categories;
    const intent = parseQueryIntent(question);
    const relevant = intent.task === "read_text_field" && analysis.ocr ? groundTextField(analysis.ocr, intent.target) : [];
    const plan = runner.planFor(analysis, { width: input.canvas.width, height: input.canvas.height });
    const artifactCanvas = renderMasked(input.canvas, plan);
    const check = await checkArtifact(await encodePng(artifactCanvas), plan);
    ui.own.append(
      figure(outline(input.canvas, analysis.sensitive.map((r) => r.bounds), relevant.map((r) => r.bounds)), "Detections: red sensitive, green relevant"),
      figure(artifactCanvas, "Clean artifact (local only)"),
    );
    const stageTimes = Object.entries(analysis.stageMs).map(([k, v]) => `${k} ${v?.toFixed(0)} ms`).join(", ");
    ui.ownStatus.textContent = [
      blocked.length > 0 ? `Blocked: stages not complete (${blocked.join(", ")}).` : "All mandatory stages completed.",
      `Sensitive regions: ${analysis.sensitive.length}. Relevant regions: ${relevant.length} (${intent.task === "read_text_field" ? intent.target : intent.reasonCode}).`,
      questionFindings.length > 0 ? `Question contains: ${questionFindings.join(", ")}.` : "No sensitive pattern found in question.",
      `Artifact check ${check.passed ? "passed" : "FAILED"}. Original metadata kinds: ${input.metadataKinds.join(", ") || "none"}; EXIF orientation ${input.exifOrientation}.`,
      `Timings: ${stageTimes}.`,
      "Relevant private fields are not exempted here; conflict policy is Phase 3.",
    ].join(" ");
  } catch (error) {
    ui.ownStatus.textContent = error instanceof InputError ? `Cannot process image: ${error.reasonCode}.` : "Analysis failed; see console.";
    console.error(error);
  } finally {
    ui.analyze.disabled = false;
  }
});

ui.clear.addEventListener("click", () => {
  ui.own.replaceChildren();
  ui.ownStatus.textContent = "";
  ui.file.value = "";
  ui.question.value = "";
});

ui.download.addEventListener("click", () => {
  if (!latestReport) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(latestReport, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `feasibility-report-${latestReport.generatedAt.replace(/[:.]/g, "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

window.addEventListener("pagehide", () => void runner.dispose());

if (import.meta.env.DEV) {
  // Developer inspection from the browser console during local debugging only.
  (window as unknown as { __harness?: unknown }).__harness = { runner };
}
