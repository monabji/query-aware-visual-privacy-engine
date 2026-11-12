/**
 * Best-available memory measurement. `measureUserAgentSpecificMemory` covers
 * the page and its workers but requires cross-origin isolation and is
 * Chromium-only; `performance.memory` reports the main-thread JS heap only.
 * Neither includes GPU memory. The method is recorded with every value.
 */

export type MemorySample = {
  readonly bytes: number | null;
  readonly method: "measureUserAgentSpecificMemory" | "performance.memory" | "unavailable";
};

type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize: number };
  measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
};

export async function sampleMemory(): Promise<MemorySample> {
  const perf = performance as PerformanceWithMemory;
  if (globalThis.crossOriginIsolated && perf.measureUserAgentSpecificMemory) {
    try {
      const result = await perf.measureUserAgentSpecificMemory();
      return { bytes: result.bytes, method: "measureUserAgentSpecificMemory" };
    } catch {
      // Fall through to the heap estimate.
    }
  }
  if (perf.memory) return { bytes: perf.memory.usedJSHeapSize, method: "performance.memory" };
  return { bytes: null, method: "unavailable" };
}
