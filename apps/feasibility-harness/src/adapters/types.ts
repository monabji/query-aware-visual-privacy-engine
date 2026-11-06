import type { StageName } from "@qavpe/core";

/** Static description of a local model adapter, mirrored in research/manifests/models.json. */
export type AdapterInfo = {
  readonly stage: StageName;
  readonly id: string;
  readonly model: string;
  readonly revision: string;
  readonly runtime: string;
  readonly license: string;
  /** Remote hosts contacted for model assets (never for user content). */
  readonly assetHosts: readonly string[];
};

export type Backend = "webgpu" | "wasm" | "gpu-delegate" | "cpu-delegate";

export type LoadReport = {
  readonly backend: Backend;
  readonly loadMs: number;
};

export type ProgressListener = (fraction: number | null, label: string) => void;

/**
 * Failures carry a content-free reason code. Messages from third-party
 * runtimes are kept out of reports because they can embed inputs.
 */
export class StageError extends Error {
  override readonly name = "StageError";
  constructor(
    readonly stage: StageName,
    readonly reasonCode: string,
    options?: { cause?: unknown },
  ) {
    super(`${stage}: ${reasonCode}`, options);
  }
}

export interface LocalAdapter<Input, Output> {
  readonly info: AdapterInfo;
  load(preferred: Backend, onProgress?: ProgressListener): Promise<LoadReport>;
  run(input: Input): Promise<Output>;
  dispose(): Promise<void>;
}

export async function timed<T>(work: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = performance.now();
  const value = await work();
  return { value, ms: performance.now() - start };
}
