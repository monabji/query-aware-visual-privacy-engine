/**
 * Constrained local question parsing.
 *
 * The question never leaves the client before approval, so intent is
 * extracted with transparent rules into a small closed schema rather than by
 * a hosted model. Anything outside the schema is "unsupported" and must be
 * handled by review, not guessed.
 */

export const INTENT_PARSER_VERSION = "intent-rules@1";

export const TEXT_FIELD_TARGETS = [
  "expiry_date",
  "manufacture_date",
  "batch_number",
  "strength",
] as const;

export type TextFieldTarget = (typeof TEXT_FIELD_TARGETS)[number];

export type QueryIntent =
  | { readonly task: "read_text_field"; readonly target: TextFieldTarget }
  | { readonly task: "unsupported"; readonly reasonCode: "NO_SUPPORTED_TARGET" | "MULTIPLE_TARGETS" };

const TARGET_RULES: ReadonlyArray<{ target: TextFieldTarget; pattern: RegExp }> = [
  { target: "expiry_date", pattern: /\b(?:expir(?:y|es|ation|e)|exp\.?|use\s+by|best\s+before)\b/i },
  { target: "manufacture_date", pattern: /\b(?:manufactur(?:e|ed|ing)\s+date|mfg\.?|mfd\.?|date\s+of\s+manufacture|made\s+on)\b/i },
  { target: "batch_number", pattern: /\b(?:batch|lot)(?:\s+(?:no\.?|number|code))?\b/i },
  { target: "strength", pattern: /\b(?:strength|dose|dosage|how\s+many\s+(?:mg|milligrams))\b/i },
];

export function parseQueryIntent(question: string): QueryIntent {
  const targets = TARGET_RULES.filter((rule) => rule.pattern.test(question)).map((rule) => rule.target);
  if (targets.length === 0) return { task: "unsupported", reasonCode: "NO_SUPPORTED_TARGET" };
  if (targets.length > 1) return { task: "unsupported", reasonCode: "MULTIPLE_TARGETS" };
  return { task: "read_text_field", target: targets[0] as TextFieldTarget };
}
