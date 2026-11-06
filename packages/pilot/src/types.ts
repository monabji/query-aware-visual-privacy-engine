import type { Polygon, SensitiveCategory, TextFieldTarget } from "@qavpe/core";

/**
 * Annotation role of a rendered element.
 *  - "sensitive": must not be disclosed unless specifically approved.
 *  - "evidence": benign content some question needs.
 *  - "benign": context that may be kept; masking it is over-redaction.
 * Sensitivity and relevance are independent: a sensitive element can also be
 * required evidence for some question (a conflict), recorded in questions.
 */
export type ElementRole = "sensitive" | "evidence" | "benign";

export type TextElementSpec = {
  readonly id: string;
  /**
   * Optional leading text on the same line, annotated separately as
   * `${id}-prefix` (e.g. the field label "Patient:" before a name). Lets a
   * line carry a benign label and a sensitive value with exact geometry.
   */
  readonly prefix?: { readonly text: string; readonly role: ElementRole };
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly fontWeight?: "normal" | "bold";
  readonly color?: string;
  readonly role: ElementRole;
  readonly category?: SensitiveCategory;
};

export type PanelSpec = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  /** Rotation in degrees around the panel's centre; applies to its elements. */
  readonly rotationDeg?: number;
  readonly elements: readonly TextElementSpec[];
};

export type QuestionSpec = {
  readonly id: string;
  readonly question: string;
  /** Expected parser output, or null when the question should be unsupported. */
  readonly expectedTarget: TextFieldTarget | null;
  readonly expectedAnswer: string | null;
  /** Element ids that constitute the minimal required evidence. */
  readonly requiredEvidence: readonly string[];
  /** Required elements that are also sensitive, i.e. expected policy conflicts. */
  readonly expectedConflicts: readonly string[];
};

export type SceneSpec = {
  readonly id: string;
  readonly description: string;
  readonly width: number;
  readonly height: number;
  readonly background: string;
  readonly panels: readonly PanelSpec[];
  readonly questions: readonly QuestionSpec[];
  /** Hard-case tags used to slice pilot results. */
  readonly tags: readonly string[];
};

/** Ground truth for one element, in canonical pixels of the rendered scene. */
export type ElementAnnotation = {
  readonly elementId: string;
  readonly role: ElementRole;
  readonly category?: SensitiveCategory;
  readonly polygon: Polygon;
};

export type RenderedScene = {
  readonly sceneId: string;
  readonly width: number;
  readonly height: number;
  readonly annotations: readonly ElementAnnotation[];
};
