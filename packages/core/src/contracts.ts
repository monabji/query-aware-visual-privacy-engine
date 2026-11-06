import type { Box, Polygon } from "./geometry.js";

/**
 * Sensitive categories under consideration for the first release.
 * A category is "supported" only once a detector and its evaluation exist;
 * see docs/SCOPE.md for the current support status of each.
 */
export const SENSITIVE_CATEGORIES = [
  "face",
  "person_name",
  "postal_address",
  "phone_number",
  "email_address",
  "identifier_number",
  "date_of_birth",
  "machine_readable_code",
] as const;

export type SensitiveCategory = (typeof SENSITIVE_CATEGORIES)[number];

export type RegionKind = "sensitive" | "relevant";

/** A detected region in canonical image pixels. */
export type Region = {
  readonly id: string;
  readonly kind: RegionKind;
  /** For sensitive regions, a SensitiveCategory; for relevant regions, the task target. */
  readonly category: string;
  readonly polygon: Polygon;
  readonly bounds: Box;
  /** Detector-specific score. Not a calibrated probability of safety. */
  readonly confidence?: number;
  /** Stable identifier of the producing adapter and model, e.g. "patterns@1" or "owlvit-base-patch32". */
  readonly source: string;
};

export type StageName =
  | "decode"
  | "ocr"
  | "sensitive_text"
  | "face_detection"
  | "query_grounding"
  | "encode"
  | "output_check";

/**
 * Outcome of one pipeline stage. "complete" with zero regions is distinct from
 * "failed" or "unsupported"; only "complete" can contribute to a send decision.
 */
export type StageStatus =
  | { readonly state: "complete"; readonly regionCount: number }
  | { readonly state: "failed"; readonly reasonCode: string }
  | { readonly state: "unsupported"; readonly reasonCode: string };

/** Every mandatory stage must be complete; anything else blocks egress. */
export function blockingStages(
  statuses: Partial<Record<StageName, StageStatus>>,
  mandatory: readonly StageName[],
): StageName[] {
  return mandatory.filter((stage) => statuses[stage]?.state !== "complete");
}
