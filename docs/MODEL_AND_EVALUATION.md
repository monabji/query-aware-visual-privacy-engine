# Models and evaluation

## Selection policy

Use pretrained models and existing hosted VLMs where they work. The user prioritizes precise outputs. Select components using task-specific evidence under the local-processing boundary, rather than a general leaderboard or a model's parameter count. No model or provider is selected yet, and no browser compatibility, availability, price, accuracy, or latency figure in the chat is a measured project result.

A model repository, a public demo/Space, an inference-provider listing, and a dedicated endpoint are different deployment options. Do not assume a model on Hugging Face is already served, private, stable, or browser-compatible. Confirm actual APIs and terms before integration. Public demos are not production dependencies or evaluation infrastructure.

## Candidate components

| Task | Candidates discussed | Constraint and selection evidence |
| --- | --- | --- |
| OCR | PaddleOCR, EasyOCR, Tesseract/browser-compatible OCR | Must actually execute locally in the chosen browser runtime; compare small-text and rotated-text recall and output geometry |
| Sensitive text | Patterns and context rules, compact local NER; Presidio as a research/reference component | Names/addresses require more than regex; a Python Presidio service receiving OCR would cross the product boundary |
| Faces and codes | Browser-compatible compact detectors; native ML Kit candidates for later wrappers | Evaluate full protected-region coverage and category-specific misses; do not assume Android ML Kit is a browser API |
| Query grounding | Grounding DINO, OWL-ViT/OWL-family, compact task-specific alternatives | Verify operators, export, memory and browser runtime; keep larger models as controlled research references if infeasible locally |
| Mask refinement | SAM, MobileSAM, SAM 2, other compact promptable segmenters | Optional where conservative boxes/OCR polygons suffice; native/GPU speed does not establish browser speed |
| Local runtime | Transformers.js, ONNX Runtime Web, WebGPU/WASM | Confirm actual model support, browser/device behavior, download sizes, and failure paths |
| Hosted answering | Qwen2.5-VL family and GLM-4.5V were initial discussion candidates; other documented VLM APIs may be compared | Recheck current serving support and licenses; choose based on the project benchmark, not an assumed winner |
| Hosting | Hugging Face Inference Providers or a dedicated endpoint; direct documented provider APIs | Fix destination/configuration for reproducibility, check terms, and keep tokens server-side |
| Voice, later | Whisper/tiny variants, other verifiably local ASR | Check audio never goes to a remote speech service; language/noise/latency evaluation required |
| Inpainting, later | LaMa or other completion models | Optional controlled experiment after opaque redaction; measure hallucinated evidence and mobile/browser feasibility |
| Embeddings, secondary | CLIP/SigLIP | Analyze task utility separately; global similarity does not establish privacy |

LiteRT and ONNX Runtime Mobile are possible native-wrapper runtimes, not replacements for testing browser inference. Quantization, model export, and NPU delegates may change quality and operator support. Benchmark converted artifacts again. FAISS belongs only to a future justified retrieval requirement.

## Primary documentation leads

These links were discussed as starting references. Consult current official docs and record verification dates when selecting a dependency; this is not a certification of every model/runtime combination.

- [Transformers.js](https://huggingface.co/docs/transformers.js/en/index) and its [WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu).
- [ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html).
- [Grounding DINO official repository](https://github.com/IDEA-Research/GroundingDINO).
- [Meta SAM 2 overview](https://ai.meta.com/research/sam2/).
- [Hugging Face hosted VLM task guide](https://huggingface.co/docs/inference-providers/tasks/image-text-to-text), [provider routing](https://huggingface.co/docs/inference-providers/index), and [dedicated endpoint security](https://huggingface.co/docs/inference-endpoints/security).
- [Android ML Kit OCR](https://developers.google.com/ml-kit/vision/text-recognition/v2/android) and [face detection](https://developers.google.com/ml-kit/vision/face-detection/android) for future native integration.
- [ONNX Runtime Mobile](https://onnxruntime.ai/docs/tutorials/mobile/) and [LiteRT Android](https://developers.google.com/edge/litert/android) for later device work.

Do not commit to the earlier desktop stack or every model in the deck. Browser feasibility may favor OCR polygons, compact detectors, a constrained intent parser, and a transparent policy over a heavyweight local VLM. A hosted VLM should answer from the sanitized artifact, not decide masks from an uploaded original.

## Browser feasibility gate

For each candidate, record exact model and revision, weight license, export artifact/checksum, preprocessing, input limits, supported tasks/languages, ONNX opset/operators, runtime/version, quantization, download/storage size, peak memory, and cold/warm execution time. Test real model outputs on representative images in the browser.

Declare a target matrix that includes at least a reference desktop browser and a representative phone browser if phone-web support is claimed. Use actual devices and note OS/browser/GPU. WASM fallback requires its own measurements. Do not replace failed local execution with a remote raw-image request. Before building the full app, select a defensible supported matrix and scope based on these results.

## Hosted VLM comparison

Start with one adapter, then compare a small set of candidate models on the same sanitized requests. Consider small text, document fields, clutter, masked evidence, answer abstention, hallucination, languages, cost, latency, API stability, and revision visibility. Existing APIs can provide strong answers, but no provider is assumed universally best.

Use server-side structured prompts that ask the model to answer only from visible evidence and say when required evidence is missing. Keep image text as data, not instructions. Do not ask for unsupported certainty scores or hidden reasoning. For objective extraction, use short structured answers and schema validation. Structured output and low temperature improve consistency but do not guarantee correctness.

Compare optional evidence references only where coordinates can be checked. Do not present invented bounding boxes or self-reported confidence as verified grounding. Reject malformed responses safely. Retain no production prompts/images/answers in logs.

For reproducible research, explicitly configure provider/model rather than allowing undocumented automatic routing. Record a revision when exposed and the evaluation date when it is not. Dedicated hosting can offer more control, but data-handling settings, reproducibility, and cost still require verification and authorization.

## Metrics and definitions

| Metric | Required definition and interpretation |
| --- | --- |
| Sensitive-region recall | Fraction of labeled protected regions adequately covered; specify coverage threshold and use original annotations, not only detected regions |
| Mask coverage/precision | Protected-pixel coverage and unnecessary covered area; report OCR/face/category results separately |
| Entity leakage rate | Unintended protected entities recoverable from outgoing image or text divided by all annotated unintended entities eligible for that evaluation |
| Per-request leakage | Fraction of requests disclosing at least one unintended protected entity; do not confuse with entity-level rate |
| Contextual inference | Recovery of private facts from remaining context; report separately from direct readable pixels |
| Task accuracy | Correctness on expected answers/variants; use exact match, normalized field accuracy, or task-specific scoring as appropriate |
| Necessary-evidence retention | Whether the task's annotated supporting evidence remains usable after sanitization |
| Coverage/abstention | Answered and blocked/review-required proportions over all valid benchmark requests |
| Useful safe-answer rate | Requests answered correctly with no unintended leakage under the stated evaluators, divided by all valid requests; state that evaluator misses remain possible |
| User intervention | Proportion and number of reviews/edits/clarifications and, when measured, user time |
| Redacted area | Fraction of output pixels masked; secondary diagnostic, not a privacy guarantee |
| Runtime | Per-stage and end-to-end cold/warm p50 and p95, plus peak memory and model-download size |
| Cost | Provider usage/cost per evaluated request under recorded pricing/date, separate from local computation |

Approved necessary sensitive disclosures must be labeled in the benchmark policy. Report intended disclosure separately from unintended leakage so specific consent does not hide detector failures. Check leakage in the outgoing question as well as the image. Blocked requests contribute no outbound product leakage but must reduce coverage; report leakage among shared requests too.

Answer comparison with an unredacted VLM reference is useful for retained utility, but that answer can itself be wrong. Curated ground truth is the primary reference. Human-review open-ended answers under a rubric. An LLM judge is secondary, should be blinded to method where practical, and requires agreement checks. Global embedding similarity remains exploratory.

## Experiment protocol

1. Select supported tasks/categories and pilot the annotations.
2. Define train/development/validation/test splits grouped by scene, identity, template, and related variants.
3. Choose metrics, release tolerances, minimum useful coverage, browser limits, and statistical reporting before held-out evaluation. Values are currently unselected.
4. Fix prompts, image transforms, provider/model settings, policy versions, seeds where supported, timeout/retry rules, and experimental conditions.
5. Tune only on the allowed development data. Separate model selection, policy selection, and final test reporting.
6. Run baselines and ablations under matched conditions; keep automatic and human-assisted workflows separate.
7. Use independent leakage probes and adjudicate uncertain recoveries. Report failure rates and unknown checks.
8. Produce per-category/slice results, confidence intervals, paired-query comparisons, and privacy–utility frontiers. Bootstrap at scene level when multiple queries share a scene.
9. Record cold downloads, warm local processing, network/provider time, and user-review time separately. Inspect claims about real-time use on target devices.
10. Freeze an experiment manifest and preserve only authorized research artifacts. Never improve a reported test score by silently changing the model, threshold, or failed-case denominator.

## Run manifest

Record run ID/date, code revision, dataset version and split, annotation/policy versions, model and export revisions, provider endpoint/config, runtime/device/browser, preprocessing and quantization, detector thresholds, mask margins, decoding/prompt settings, evaluator revisions, seeds, retries, failure handling, aggregate metrics, confidence intervals, and known limitations. Store private research payloads separately with access/retention rules; commit only distributable metadata and aggregate outputs.

## Quality gates still to select

There is no agreed numeric leakage tolerance, minimum task accuracy, minimum coverage, latency budget, supported image size, or resource limit yet. Select and justify them after pilot feasibility and before the held-out run. A good-looking demo, an API success response, zero observed failures in a tiny sample, or a VLM's own assurance must not substitute for those gates.
