# Decisions and open questions

## How to read this record

This record synthesizes the project conversation and deck through 2026-10-22. **Accepted** reflects explicit user direction or the architecture the user approved. **Specification detail** makes that direction concrete and can be refined without changing its boundary. **Provisional** is an implementation default subject to evidence. **Hypothesis** requires research. **Deferred** belongs to later scope. **Superseded** identifies advice the user replaced.

All supporting Markdown files live in `docs/`. Root `AGENTS.md` is the entry point and instructs agents to read this folder. Do not maintain competing copies of the specs.

## Accepted direction

| ID | Decision | Reason and consequence |
| --- | --- | --- |
| D01 | Web app is the primary prototype | User rejected a desktop prototype and proposed wrappers later. Start with browser execution and a web interface. |
| D02 | Original images remain on the client during privacy processing | User approved the flow that sanitizes/checks locally and sends only reviewed output. Remote raw-image redaction is not an implicit fallback. |
| D03 | Existing hosted VLMs may answer sanitized requests | User asked for hosted models and precise outputs, then accepted the resulting architecture. No specific provider/model is chosen. |
| D04 | Keep relevance and sensitivity separate | The approved flow detects both and resolves conflicts. Relevant private fields require explicit handling. |
| D05 | Preview and approval precede sharing | The approved flow shows the outgoing artifact and blocks failures. Approval is for that request, not blanket future access. |
| D06 | Pursue a defensible publishable contribution | User explicitly requires uniqueness. Method and benchmark evidence matter; publication and novelty remain unproven. |
| D07 | Phone and desktop wrappers may follow | Reuse UI/contracts where practical and validate native inference separately. No wrapper is required to complete the web MVP. |
| D08 | Generate agent docs plus `phases.md` | User requested all discussed files and a comprehensive summary after reviewing the chat and deck. |
| D09 | Keep every supporting Markdown file in one folder | Latest user instruction places `README.md`, `phases.md`, and the other specs in `docs/`, with only `AGENTS.md` outside. |

## Specification details

| ID | Detail | Why it follows from the accepted design |
| --- | --- | --- |
| S01 | Start with still photos and typed questions | Narrow initial scope makes the core flow measurable; voice/video remain on the roadmap. |
| S02 | Opaque masks are the default | They directly replace selected pixels. Inpainting is optional and can alter factual evidence. |
| S03 | Review outgoing question text too | A user's question can contain private facts independently of the image. |
| S04 | Approval binds exact bytes/question/destination and is invalidated by changes | Prevents stale previews, late jobs, and hidden destination changes from widening disclosure. |
| S05 | No content persistence or content logging by default | Keeps the browser/backend flow consistent with its privacy purpose. |
| S06 | Model/runtime failures block upload | A raw-image server fallback would break D02. |
| S07 | Keep provider keys on a thin backend | Protects credentials while limiting the backend's responsibility to approved requests. |
| S08 | Separate controlled research baselines from product traffic | Unredacted reference experiments require their own permitted data handling. |
| S09 | Plain evidence-based privacy language | Checks have limits; no zero-leakage, legal-compliance, or formal differential-privacy claim is established. |
| S10 | UI design context goes in `docs/DESIGN.md` when UI work begins | Complies with the folder rule and leaves visual decisions available to later implementation. |

## Provisional choices

- TypeScript, React with Vite, and a separate thin TypeScript API are a default starting stack. Next.js remains an alternative. Record the final choice before scaffolding.
- Transformers.js or ONNX Runtime Web with WebGPU/WASM are candidate browser runtimes. Actual compatibility and performance are unmeasured.
- Printed English/Latin text and a small task/category list are initial scope proposals. Final support requires a Phase 1 record.
- Package-label, medicine-label transcription, and simple document questions are candidate domains, not a medical-advice feature.
- Grounding DINO/OWL-family grounding, SAM-family masks, OCR tools, local NER/patterns, and compact face/code detectors are candidates. The deck's software list is not an installation checklist.
- Qwen2.5-VL and GLM-4.5V were hosted-VLM examples. Recheck their serving availability and compare task performance with other permitted models. No model has earned a "best" label.
- Pilot data determine the benchmark scale, supported matrix, thresholds, and practical latency budget. No number is yet agreed.

## Research hypotheses and source correction

The proposed distinctive element is a field-level policy combining independent relevance/sensitivity with conflict review and uncertainty, evaluated on paired queries and privacy–utility trade-offs. A benchmark and measured local browser implementation may support the contribution. These are hypotheses and engineering contributions, not a completed novelty proof.

The original discussion's broad claim that no prior work addresses task-oriented visual privacy is not an established result. The deck's image-only brief cites ReVision, which must be included in related work and representation comparisons. The research plan links the official source. Broaden the literature review before positioning a paper.

## Superseded or deferred suggestions

| Earlier suggestion or deck ambition | Current treatment |
| --- | --- |
| Desktop application prototype first | Superseded by web-first direction. Offline Python evaluation remains permissible. |
| Full original image to a hosted VLM for privacy reasoning | Outside accepted product boundary. Only a separately authorized controlled research workflow may use originals. |
| Keep all relevant regions automatically | Replaced by independent sensitivity analysis and field-level conflict handling. |
| Native Android/Kotlin/ML Kit as the first app | Deferred wrapper/native option, not a browser dependency. |
| SAM/LaMa and every other named model as mandatory components | Candidate/optional components, selected after feasibility and quality evidence. |
| Embedding similarity as the primary utility test | Secondary metric. Correct answers, necessary evidence, leakage, and coverage are primary. |
| FAISS/vector database in the MVP | Deferred until there is a concrete retrieval need. |
| Voice and live video immediately | Deferred until the still-image core works and is evaluated. |
| On-device answering fallback | Future capability. Present behavior is local correction/review or cancellation, never raw-image cloud fallback. |
| NPU/real-time processing assumed from model claims | Requires specific device/runtime measurements. |
| Formal privacy budget or guaranteed compliance | Not established by this architecture or redaction scoring. |

## Open questions and when to resolve them

| Question | Resolve by | Evidence needed |
| --- | --- | --- |
| Which desktop/phone browsers and devices are supported? | Phase 1 | Real local-runtime results and memory/download limits |
| Which image formats, resolutions, tasks, languages and categories? | Phase 1 | Pilot examples, detector coverage and user-facing scope |
| Which framework and browser models? | Phase 1 | Feasibility plus maintainability and license review |
| What rules govern necessary sensitive disclosures? | Phases 1–3 | Task/category policy, conflict examples and clear preview behavior |
| Which hosted VLM/provider and cost ceiling? | Before Phase 4 integration/charged use | Current APIs/terms, model comparison and user budget authorization where needed |
| What are leakage, accuracy, coverage, latency and resource gates? | Before frozen Phase 5 evaluation | Validation/pilot evidence and documented operational goals |
| What dataset size and distribution are defensible? | Phases 1–5 | Annotation pilot, sampling rationale and uncertainty analysis |
| What is the validated research contribution and target venue? | Phases 1–6 | Related-work review, matched baselines and reproducible results |
| When should voice, live preview, inpainting or wrappers be built? | After relevant core gates | A separate feasible scope and benefit relative to research work |

Routine implementation can proceed using recorded defaults; do not repeatedly ask the user to reconfirm accepted architecture. Material changes to the privacy boundary or new external costs require clear authorization.

## Future decision template

Record ID/date, status, decision, context/evidence, alternatives, consequences, affected docs, and revisit trigger. If a user changes direction, mark the old decision superseded and update the owning specs. Keep completed decision history but maintain one current source for each requirement.
