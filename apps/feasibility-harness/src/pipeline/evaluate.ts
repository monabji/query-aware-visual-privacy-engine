import {
  coverageByUnion,
  intersectBoxes,
  polygonBounds,
  type Box,
  type MaskPlan,
  type Region,
  type TextFieldTarget,
} from "@qavpe/core";
import type { ElementAnnotation, QuestionSpec, RenderedScene } from "@qavpe/pilot";

/**
 * Pilot scoring against render-time ground truth. Thresholds are
 * provisional feasibility diagnostics, not release gates; see
 * docs/MODEL_AND_EVALUATION.md for the gate-selection process.
 */
export const EVAL_THRESHOLDS = {
  /** A sensitive element counts as protected when masks cover this fraction of its box. */
  sensitiveCovered: 0.98,
  /** Evidence counts as damaged when masks cover more than this fraction. */
  evidenceDamaged: 0.1,
  /** Benign context counts as over-redacted when masks cover more than this fraction. */
  benignOverRedacted: 0.5,
  /** Grounding counts as finding evidence when relevance regions cover this fraction. */
  evidenceGrounded: 0.8,
} as const;

export type QuestionEvaluation = {
  readonly questionId: string;
  readonly intentCorrect: boolean;
  readonly expectedTarget: TextFieldTarget | null;
  readonly groundedRegionCount: number;
  /** Required evidence found by text-anchor grounding; null when no evidence is required. */
  readonly evidenceGrounded: boolean | null;
  /** Correctly returned no relevance when the evidence is absent. */
  readonly correctlyEmpty: boolean | null;
  /** Relevance regions that intersect planned masks (candidate policy conflicts). */
  readonly overlapsWithMasks: number;
  readonly expectedConflicts: number;
  /** Visual grounding (OWL-ViT) box covering the required evidence; null when not run or not applicable. */
  readonly visualGroundingCovers: boolean | null;
};

export type SceneEvaluation = {
  readonly sceneId: string;
  readonly tags: readonly string[];
  readonly sensitiveTotal: number;
  readonly sensitiveCovered: number;
  readonly sensitiveByCategory: Record<string, { total: number; covered: number }>;
  readonly evidenceTotal: number;
  readonly evidenceDamaged: number;
  readonly benignTotal: number;
  readonly benignOverRedacted: number;
  readonly falsePositiveFaces: number;
  readonly questions: readonly QuestionEvaluation[];
};

const boundsOf = (annotation: ElementAnnotation): Box => polygonBounds(annotation.polygon);

export function evaluateMasks(
  rendered: RenderedScene,
  plan: MaskPlan,
): Pick<SceneEvaluation, "sensitiveTotal" | "sensitiveCovered" | "sensitiveByCategory" | "evidenceTotal" | "evidenceDamaged" | "benignTotal" | "benignOverRedacted"> {
  const byCategory: Record<string, { total: number; covered: number }> = {};
  let sensitiveTotal = 0;
  let sensitiveCovered = 0;
  let evidenceTotal = 0;
  let evidenceDamaged = 0;
  let benignTotal = 0;
  let benignOverRedacted = 0;
  for (const annotation of rendered.annotations) {
    const coverage = coverageByUnion(boundsOf(annotation), plan.boxes);
    if (annotation.role === "sensitive") {
      const key = annotation.category ?? "uncategorized";
      const entry = (byCategory[key] ??= { total: 0, covered: 0 });
      entry.total += 1;
      sensitiveTotal += 1;
      if (coverage >= EVAL_THRESHOLDS.sensitiveCovered) {
        entry.covered += 1;
        sensitiveCovered += 1;
      }
    } else if (annotation.role === "evidence") {
      evidenceTotal += 1;
      if (coverage > EVAL_THRESHOLDS.evidenceDamaged) evidenceDamaged += 1;
    } else {
      benignTotal += 1;
      if (coverage > EVAL_THRESHOLDS.benignOverRedacted) benignOverRedacted += 1;
    }
  }
  return { sensitiveTotal, sensitiveCovered, sensitiveByCategory: byCategory, evidenceTotal, evidenceDamaged, benignTotal, benignOverRedacted };
}

export function evaluateQuestion(
  rendered: RenderedScene,
  question: QuestionSpec,
  parsedTarget: TextFieldTarget | null,
  grounded: readonly Region[],
  plan: MaskPlan,
  visual: readonly Region[] | null,
): QuestionEvaluation {
  const required = rendered.annotations.filter((a) => question.requiredEvidence.includes(a.elementId));
  const relevantBoxes = grounded.map((r) => r.bounds);
  const answerable = question.expectedTarget !== null && question.expectedAnswer !== null;
  const evidenceGrounded =
    answerable && required.length > 0
      ? required.every((a) => coverageByUnion(boundsOf(a), relevantBoxes) >= EVAL_THRESHOLDS.evidenceGrounded)
      : null;
  const correctlyEmpty = question.expectedTarget !== null && !answerable ? grounded.length === 0 : null;
  const overlapsWithMasks = grounded.filter((r) => plan.boxes.some((box) => intersectBoxes(r.bounds, box) !== null)).length;
  const visualGroundingCovers =
    visual && answerable && required.length > 0
      ? required.every((a) => visual.some((v) => coverageByUnion(boundsOf(a), [v.bounds]) >= EVAL_THRESHOLDS.evidenceGrounded))
      : null;
  return {
    questionId: question.id,
    intentCorrect: parsedTarget === question.expectedTarget,
    expectedTarget: question.expectedTarget,
    groundedRegionCount: grounded.length,
    evidenceGrounded,
    correctlyEmpty,
    overlapsWithMasks,
    expectedConflicts: question.expectedConflicts.length,
    visualGroundingCovers,
  };
}
