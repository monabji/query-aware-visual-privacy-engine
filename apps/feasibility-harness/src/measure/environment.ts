/** Content-free description of the execution environment for feasibility reports. */

export type EnvironmentReport = {
  readonly userAgent: string;
  readonly platform: string;
  readonly hardwareConcurrency: number;
  readonly deviceMemoryGb: number | null;
  readonly crossOriginIsolated: boolean;
  readonly webGpu: { available: boolean; vendor: string | null; architecture: string | null };
  readonly wasmSimd: boolean;
  readonly sharedArrayBuffer: boolean;
};

type GpuAdapterLike = { info?: { vendor?: string; architecture?: string } };

async function webGpuInfo(): Promise<EnvironmentReport["webGpu"]> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<GpuAdapterLike | null> } }).gpu;
  if (!gpu) return { available: false, vendor: null, architecture: null };
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return { available: false, vendor: null, architecture: null };
    return { available: true, vendor: adapter.info?.vendor ?? null, architecture: adapter.info?.architecture ?? null };
  } catch {
    return { available: false, vendor: null, architecture: null };
  }
}

function wasmSimdSupported(): boolean {
  // Minimal module using a v128 instruction; validation fails without SIMD support.
  const bytes = new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
  ]);
  return WebAssembly.validate(bytes);
}

export async function describeEnvironment(): Promise<EnvironmentReport> {
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { platform?: string } };
  return {
    userAgent: navigator.userAgent,
    platform: nav.userAgentData?.platform ?? navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemoryGb: nav.deviceMemory ?? null,
    crossOriginIsolated: globalThis.crossOriginIsolated === true,
    webGpu: await webGpuInfo(),
    wasmSimd: wasmSimdSupported(),
    sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
  };
}
