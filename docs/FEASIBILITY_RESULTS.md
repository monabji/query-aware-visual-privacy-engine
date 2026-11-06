# Phase 1 browser feasibility results

Run date: 2026-11-06. Raw content-free reports: `research/results/2026-11-06-feasibility-wasm.json` and `research/results/2026-11-06-feasibility-webgpu.json`. Model pins: `research/manifests/models.json`.

## What these results are and are not

- They are measurements of real local model execution on **synthetic** pilot scenes (`pilot-scenes@2`, 5 scenes, 12 questions) in one desktop browser.
- They are **not** benchmark results. The scenes are clean renders of fabricated text. Real photographs have blur, glare, perspective, and clutter. These numbers say nothing about accuracy on photographs and must not be quoted as such.
- Diagnostic thresholds are the provisional values in `docs/ANNOTATION_GUIDE.md`. No release gate has been selected.

## Environment

| Item | Value |
| --- | --- |
| Browser | Chromium 152.0.7977.167, embedded desktop browser, Windows 11 |
| CPU threads / device memory | 12 / 16 GB (as reported by the browser) |
| GPU | Intel integrated, `gen-12lp` (WebGPU adapter available) |
| Cross-origin isolated | Yes (threaded WASM available) |
| WASM SIMD | Yes |

Only one device and one browser were measured. No phone browser was measured.

## Stage feasibility

| Stage | Component | WASM | WebGPU | Notes |
| --- | --- | --- | --- | --- |
| OCR | Tesseract.js 7.0.0, eng LSTM | Runs | Not applicable (WASM worker) | Accurate on upright synthetic text; fragments lines under 7° rotation |
| Sensitive text, rules | `sensitive-patterns@1` | Runs | Runs | Deterministic, under 1 ms per scene |
| Sensitive text, NER | Xenova/bert-base-NER | Runs (q8) | Runs (fp32) | Grouped output has no character offsets; spans are recovered by text location and fail closed |
| Faces | MediaPipe BlazeFace short-range | Runs (CPU delegate) | Runs (GPU delegate) | No false positives on 5 text scenes. **True-positive accuracy unmeasured**: no consented face images yet |
| Text grounding | `text-anchor@1` over OCR | Runs | Runs | All supported pilot questions grounded |
| Visual grounding | Xenova/owlvit-base-patch32 | **Fails** | **Fails** | Session creation fails on `/class_head/Cast` with ONNX Runtime Web 1.31.0-dev on both backends |
| Mask and encode | Canvas opaque fill and PNG | Runs | Runs | |
| Output check | `artifact-check@1` | Runs | Runs | |

## Quality on the synthetic pilot (WASM run)

| Measure | Result |
| --- | --- |
| Sensitive elements covered (≥98% of bounds) | 13 / 15 |
| Misses | Rotated sticker: `person_name` 0/1, `postal_address` 0/1 |
| Evidence elements damaged (>10% masked) | 1 / 15. Same-line case: the "Patient:" label rule extends to the end of the line and masks the use-by date |
| Benign elements over-redacted (>50% masked) | 1 / 21. A manufacturer helpline matched the phone pattern, as the probe expected |
| Questions with correct local intent | 12 / 12 |
| Answerable questions with evidence grounded | 9 / 9 |
| Unanswerable question correctly returning no relevance | 1 / 1 |
| Relevance regions overlapping masks (candidate conflicts) | 1. The same-line use-by case, correctly surfaced as a conflict for Phase 3 policy |
| Clean artifacts passing all checks | 5 / 5. PNG with only allowed chunks, matching dimensions, fully opaque, every mask box exact |
| Readable private values found by re-OCR of artifacts | 0 in 5 artifacts. This is a weak check because it uses the same OCR engine |

The WebGPU run produced identical quality results.

## Timing (WASM run, per scene, warm)

| Stage | First run (ms) | Warm p50 (ms) | Warm p95 (ms) | Samples |
| --- | --- | --- | --- | --- |
| OCR | 266 | 174 | 222 | 14 |
| Sensitive patterns | 0.7 | 0.05 | 0.5 | 14 |
| NER | 239 | 136 | 196 | 14 |
| Faces | 65 | 9.8 | 18.7 | 14 |
| Mask fill | 0.2 | 0.2 | 0.3 | 4 |
| PNG encode | 15.4 | 11.8 | 17.9 | 4 |
| Artifact check | 8.4 | 6.7 | 13.2 | 4 |

Scenes are 820–960 px wide. Sample sizes are small, so p95 equals the maximum here.

WebGPU warm p50 values were OCR 200 ms, NER 278 ms, and faces 43.6 ms. That run overlapped a concurrent 612 MB download, so its timings are confounded and are not evidence that WebGPU is slower. A clean WebGPU comparison is still to be done.

An earlier run with the browser pane hidden showed OCR around 1.2 s and PNG encoding around 1 s per scene, which reflects background-tab throttling. Measurements must be taken with the page visible.

## Load and download cost

| Item | Size | Notes |
| --- | --- | --- |
| BERT NER q8 (WASM) | 109.0 MB | Cached by the browser after first load |
| BERT NER fp32 (WebGPU) | 431.2 MB | **Not retained in the browser cache** in this browser; re-downloaded on every cold page load |
| BERT tokenizer | 0.7 MB | |
| OCR language data | 2.95 MB (gzip) | Cached in IndexedDB by Tesseract.js |
| Face model | 0.23 MB | |
| Runtime WASM (ONNX Runtime, Tesseract core, MediaPipe) | 43.3 MB | Served from the app origin |
| **WASM path total** | **≈156 MB first visit** | 112.9 MB models + 43.3 MB runtime |

Model load times, WASM: NER 56.5 s cold (network-bound) and 2.1 s from cache; OCR 0.15–0.46 s; faces 0.23–0.84 s. WebGPU NER fp32 cold load took 136–190 s.

JS heap (`performance.memory`, main thread only, excludes workers and GPU): 268 MB after WASM loading, 720 MB with fp32 WebGPU weights. `measureUserAgentSpecificMemory` returned no value in this browser despite cross-origin isolation.

## Network and privacy observations

- **The Content-Security-Policy recorded no violations.** Every main-thread request went to the app origin, `huggingface.co`, or `storage.googleapis.com`.
- **MediaPipe Tasks Vision telemetry.** The library sent a `POST` with a protobuf body to `odml.pa.googleapis.com/v1/log`. The egress guard blocked it, and the CSP would also block it. Inspection of the bundle shows that the logger is created unconditionally with an embedded API key and flushes every 60 seconds and when the task closes. The API offers no opt-out. Recorded as D12.
- One `config.json` request used the `main` revision rather than the pinned revision. This needs tracing before a reproducible release.
- Cross-origin resource sizes read as 0 because those hosts send no `Timing-Allow-Origin` header. Sizes above come from the hosts' metadata.
- After OWL-ViT failed to create a session, a later NER session in the same page failed with OWL-ViT's error text. This is observed and not yet diagnosed. Mitigation: load each backend configuration in a fresh page, and do not load OWL-ViT in the product.

## Gate assessment

Phase 1 exit gate: "at least one feasible local path for each required stage on the declared initial targets, or a candidly narrowed support scope."

| Required stage | Feasible local path on the declared target | Status |
| --- | --- | --- |
| OCR | Tesseract.js WASM | Yes |
| Sensitive text | Patterns + BERT NER (WASM q8) | Yes |
| Face detection | BlazeFace (CPU or GPU delegate) | Execution yes; accuracy unmeasured, so faces are provisional in `docs/SCOPE.md` |
| Query grounding | Text-anchor over OCR for the four supported targets | Yes. Visual grounding infeasible with the tested export and runtime; scope narrowed |
| Optional segmentation | Not needed for the supported categories | Deferred |
| Final encoding and checks | Canvas PNG + re-decode checks | Yes |

## Open items before Phase 2 relies on this

1. Evaluate face detection on consented or licensed face images, including small background faces.
2. Add deskewing or a rotation-robust OCR path, then re-measure the rotated scene.
3. Measure at least one more desktop browser and one real phone browser.
4. Repeat the WebGPU timing in a fresh page without concurrent downloads.
5. Trace the unpinned `config.json` request.
6. Pilot on real photographs under the annotation guide's consent rules.
