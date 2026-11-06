import { env } from "@huggingface/transformers";

/**
 * Shared Transformers.js configuration. Models come only from the Hugging
 * Face Hub at pinned revisions; no local-path probing against this origin.
 */
let configured = false;

export function configureTransformers(): void {
  if (configured) return;
  env.allowLocalModels = false;
  env.allowRemoteModels = true;
  env.useBrowserCache = true;
  configured = true;
}

export async function webGpuAvailable(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return (await gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}
