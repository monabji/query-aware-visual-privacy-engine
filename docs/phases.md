# Implementation phases

## How to use this plan

Proceed in dependency order and record evidence at each exit gate. Use small deliverables with real local processing. Keep incomplete gates open and mark work as planned, in progress, blocked, or complete. A phase is complete only when its stated deliverables exist and its relevant checks pass. Documentation does not establish app functionality.

The six-month outline comes from the source worklet and is a planning guide, not an agreed deadline or a reason to skip quality gates. No implementation phase is complete yet. Future dates, budget, device matrix, dataset size, provider, and numeric quality targets remain unselected.

## Status

| Phase | Status | Evidence or next action |
| --- | --- | --- |
| 0: Project instructions | Complete | Root `AGENTS.md` and eight canonical Markdown files in `docs/`; based on full chat and 14-slide deck |
| 1: Scope, research, and browser feasibility | Planned | Next phase; demonstrate local model execution and resolve initial scope |
| 2: Local still-image application | Planned | Requires Phase 1 execution/scope decisions |
| 3: Query-aware policy and exact preview | Planned | Requires real local detections and geometry |
| 4: Hosted VLM answer path | Planned | Requires local sanitizer, checks, and approval gate |
| 5: Benchmark and method refinement | Planned | Dataset work starts in Phase 1; final comparison requires Phase 4 |
| 6: Research package and supported release | Planned | Requires held-out evidence and documented limitations |
| Extensions: Voice, video, wrappers | Deferred | Separate feasibility and authorization/scope decisions after the core gates |

## Phase 0: Project instructions

Deliverables: all agreed instruction files, a coherent source/decision map, accepted privacy boundaries, provisional model choices, and this phase sequence. Keep `AGENTS.md` at the root and supporting Markdown under `docs/`.

Exit gate: instructions distinguish current status from planned implementation, later user choices from superseded proposals, and hypotheses from measured findings. All referenced local documents exist and cross-links resolve. No software or benchmark accomplishment is implied.

## Phase 1: Scope, related work, and browser feasibility

Work:

- Read the required docs and compare directly related work, including ReVision. Record a defensible proposed difference before asserting novelty.
- Select a small initial task set, sensitive categories, supported language/script, formats, input limits, and browser/device matrix. Keep precise text extraction distinct from medical advice.
- Create a small consented/synthetic pilot with overlapping relevant and private fields and multiple questions per scene.
- Build a minimal browser feasibility page/harness for local OCR, face detection, query grounding, optional segmentation, and final encoding. This is web work, not a desktop-app prototype.
- Confirm actual runtime/model compatibility, licenses, resource costs, output geometry, cold/warm latency, and failure behavior. Keep original images local during this work.
- Record framework/runtime/model decisions, pilot annotations, evaluation metrics, and a plan to set numeric gates before held-out experiments.

Deliverables: browser feasibility evidence, initial model manifest, scope/browser support decision, related-work comparison, pilot dataset/annotation guide, and updated decisions.

Exit gate: at least one feasible local path for each required stage on the declared initial targets, or a candidly narrowed support scope that still respects the user-approved architecture. No hidden cloud fallback. A full UI scaffold without feasible local processing does not pass this phase.

## Phase 2: Local still-image application

Work:

- Scaffold the selected web app and create `docs/DESIGN.md` when UI work starts. Implement selection, local decoding, normalized orientation, model loading, and explicit session state.
- Integrate real local OCR/sensitive-text and visual detection for the chosen categories. Retain canonical geometry through crops and resizing.
- Add conservative opaque masking, clean output encoding, metadata removal, and local output decoding/checks.
- Add cancellation, reset, model-loading errors, unsupported-case behavior, and resource cleanup. Separate model assets from user content.
- Keep outbound VLM calls disabled until the approval flow is implemented in Phase 3.

Deliverables: working web application with a local sanitization path, meaningful targeted checks, supported-format/category documentation, and actual setup commands in `docs/README.md`.

Exit gate: original data stays local across selection, errors, reset, and processing; real masks align with image content; metadata is removed; mandatory-stage failure blocks sharing. Clearly labeled fixtures cannot serve as integration evidence.

## Phase 3: Query-aware policy and exact preview

Work:

- Add constrained local query parsing and grounding. Keep relevance and sensitivity independent.
- Implement field-level conflict decisions, safe defaults, local correction/recrop, clarification, and specific disclosure review where allowed.
- Review the outgoing question for private text. Prepare one immutable output artifact and show that exact artifact, question, and destination.
- Add final checks, stale-job protection, approval invalidation, and the only allowed transition to a send-capable state.
- Evaluate paired queries and challenging overlapping regions using pilot annotations.

Deliverables: complete local flow through preview and approval, documented policy version, targeted checks for conflict/race/approval behavior, and updated product acceptance evidence.

Exit gate: a relevant prescription does not automatically reveal a name; edits invalidate approval; failed checks block upload; the question and image both match preview. No app action can silently send raw content to repair a failure.

## Phase 4: Hosted VLM answer path

Work:

- Verify current serving support, license, revision visibility, privacy/retention terms, and cost for candidate providers. Prepare configuration within the user's existing authorization; do not create paid commitments by assumption.
- Implement one server adapter with credentials kept private, bounded payload validation, destination allowlists, content-free errors, and no user-content logging/storage.
- Send only the explicit approved request. Ask the VLM to use visible evidence and abstain when it cannot read the answer.
- Add response validation, safe answer rendering, cancellation, timeout/rate-limit handling, and sanitized-only retries.
- Inspect the complete network path and run controlled end-to-end examples, including failures, using permitted data.

Deliverables: actual approved-image-to-answer flow, provider manifest/terms record, configuration instructions, and integration evidence.

Exit gate: backend/provider receive only approved output content; no API key reaches the frontend; responses are real and not fabricated; provider failures never widen disclosure. Backend validation is not described as proof of correct client redaction.

## Phase 5: Benchmark and method refinement

Work:

- Finalize and review annotations, licenses, consent, scene-grouped splits, hard cases, and paired-query examples. Freeze the held-out split.
- Select validation-based thresholds and numeric quality/resource gates before final test evaluation.
- Implement the baselines and ablations in `RESEARCH_PLAN.md`, including fixed redaction, query-only alternatives, the naive relevance exemption, and compatible text-rewriting comparisons.
- Compare candidate answer VLMs separately from policy comparisons. Preserve matched prompts/configuration for primary method comparisons.
- Measure privacy, answer accuracy, coverage, necessary-evidence retention, intervention burden, browser compatibility, timing, memory, and cost.
- Review errors, improve the method on development data, then freeze a final configuration. Re-evaluate converted/quantized models rather than inheriting their original scores.

Deliverables: reproducible manifests, aggregate results and uncertainty, privacy–utility curves, ablation findings, failure taxonomy, and a supported contribution statement.

Exit gate: gains are demonstrated under matched conditions or the contribution is revised honestly; blocked cases remain in denominators; no raw private product data is used without separate research permission; no test-set tuning or fabricated results.

## Phase 6: Research package and supported release

Work:

- Complete the manuscript/method description, related-work positioning, system diagram, annotation guide, data/model statements, reproducibility instructions, and limitations.
- Package distributable code, configs, and permitted research artifacts. Keep restricted data and credentials out of published material.
- Align product support claims with measured browsers, categories, languages, and quality gates. Document unresolved misses and user-review requirements.
- Prepare release/deployment artifacts. Publish, incur ongoing costs, distribute data, or submit a paper only within explicit user authorization.

Deliverables: concrete reviewable research/release package and a working supported demo.

Exit gate: another authorized researcher can follow the instructions to reproduce the reported setup, and claims match evidence. Documentation cannot promise acceptance by a venue.

## Deferred extensions

| Extension | Required gate |
| --- | --- |
| Voice | Verifiably local recording/transcription, language/noise evaluation, transcript privacy review |
| Live camera preview | Redetection plus tracking, scene-change handling, no unprotected transmitted frames, measured temporal leakage/flicker/latency |
| Phone/desktop wrappers | Reused contracts/UI plus verified camera permissions, model execution, storage, and native-adapter behavior |
| Local answering | A working local model with independent quality/resource evaluation; blocked requests never fall back to cloud originals |
| Inpainting | Immutable removal of original pixels, leakage probes, factual-distortion evaluation, and clear generated-content treatment |
| Multilingual/fine-tuned models | Licensed/consented data, new benchmark slices, export/runtime reevaluation |

## Indicative six-month mapping

Month 1: Phase 1. Month 2: Phase 2 and ongoing annotation. Month 3: Phases 3–4. Month 4: complete core integration and begin controlled comparisons. Month 5: Phase 5, refinement and final frozen evaluation. Month 6: Phase 6. Extensions proceed only when core evidence supports them. This mapping can change without redefining the phase gates.

## Completion record format

For each phase update, record date, status, deliverable paths, relevant code/config revisions, checks actually performed, observations, unresolved issues, and the next dependent action. Keep records free of user images, questions, answers, private OCR, or content hashes. Do not mark complete merely because time ran out.
