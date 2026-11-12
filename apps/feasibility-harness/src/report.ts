import type { StageName, TimingSummary } from "@qavpe/core";
import type { AdapterInfo, LoadReport } from "./adapters/types.js";
import type { EnvironmentReport } from "./measure/environment.js";
import type { MemorySample } from "./measure/memory.js";
import type { BlockedRequest, CspViolation, ResourceSummary } from "./measure/network-audit.js";
import type { ArtifactCheck } from "./pipeline/clean-artifact.js";
import type { SceneEvaluation } from "./pipeline/evaluate.js";

/**
 * Feasibility report. Content-free by construction: it holds identifiers,
 * counts, timings and sizes, never OCR strings, questions, answers, pixels or
 * digests. Pilot scene ids refer to synthetic fixtures in @qavpe/pilot.
 */
export const REPORT_VERSION = "feasibility-report@1";

export type AdapterLoadResult =
  | { readonly info: AdapterInfo; readonly status: "loaded"; readonly load: LoadReport }
  | { readonly info: AdapterInfo; readonly status: "failed"; readonly reasonCode: string };

export type StageTiming = {
  readonly stage: StageName;
  readonly adapterId: string;
  /** First inference after model load (includes runtime warm-up). */
  readonly firstRunMs: number | null;
  /** Subsequent runs on the same inputs. */
  readonly warm: TimingSummary | null;
};

export type FeasibilityReport = {
  readonly reportVersion: string;
  readonly generatedAt: string;
  readonly harnessRevision: string;
  readonly preferredBackend: string;
  readonly environment: EnvironmentReport;
  readonly adapters: readonly AdapterLoadResult[];
  readonly timings: readonly StageTiming[];
  readonly pilot: {
    readonly scenesVersion: string;
    readonly repeats: number;
    readonly scenes: readonly SceneEvaluation[];
    readonly artifactChecks: readonly (ArtifactCheck & { sceneId: string; residualSensitiveFindings: number; maskedAreaFraction: number })[];
  } | null;
  readonly memory: readonly (MemorySample & { readonly at: string })[];
  readonly network: {
    readonly resources: readonly ResourceSummary[];
    readonly blockedRequests: readonly BlockedRequest[];
    readonly cspViolations: readonly CspViolation[];
  };
};
