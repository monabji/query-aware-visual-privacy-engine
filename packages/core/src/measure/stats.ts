/** Summary statistics for content-free timing measurements. */

export type TimingSummary = {
  readonly count: number;
  readonly minMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly maxMs: number;
};

/** Nearest-rank percentile on a sorted copy; `p` in [0, 100]. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) throw new RangeError("percentile of empty sample");
  if (p < 0 || p > 100) throw new RangeError("percentile must be within [0, 100]");
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1] as number;
}

export function summarizeTimings(values: readonly number[]): TimingSummary {
  return {
    count: values.length,
    minMs: Math.min(...values),
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
    maxMs: Math.max(...values),
  };
}
