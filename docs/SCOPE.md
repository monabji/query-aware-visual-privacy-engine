# Initial scope and support decision

Status: Phase 1 decision, 2026-11-06, based on the feasibility evidence in `docs/FEASIBILITY_RESULTS.md`. It narrows the provisional scope in `PRODUCT_SPEC.md` to what has a working local path. Widen it only with new evidence.

## Tasks

The first release answers **printed-text field questions about product and medicine packaging and simple printed documents**. The local intent parser (`intent-rules@1`) recognises four targets:

| Target | Example question | Status |
| --- | --- | --- |
| `expiry_date` | "What expiry date is printed on this package?" | Supported in pilot |
| `manufacture_date` | "What is the manufacture date?" | Supported by parser and grounding; no pilot question yet |
| `batch_number` | "What is the batch or lot number?" | Supported in pilot |
| `strength` | "What strength are these tablets?" | Supported in pilot |

Any other question is `unsupported`. The app must report that and ask the user to revise the question. It must not guess a target. Medicine questions cover reading visible text only. They are not dosage or clinical advice.

## Language and script

English, printed Latin script. Handwriting, other scripts, and other languages are unsupported. A detector run on unsupported text does not count as protection.

## Sensitive categories

| Category | First-release status | Local mechanism | Evidence |
| --- | --- | --- | --- |
| `person_name` | Supported with field labels; unlabelled names best effort | Field labels plus BERT NER | Pilot: covered on upright scenes; missed under 7° rotation |
| `postal_address` | Supported with an address label | Field label with two continuation lines plus NER `LOC` | Pilot: covered on upright scenes; missed under rotation |
| `phone_number` | Supported | Value pattern and labels | Pilot: covered in every scene |
| `email_address` | Supported | Value pattern | Pilot: covered |
| `identifier_number` | Supported for tokens with at least 6 digits | Value pattern | Pilot: covered; date-shaped tokens excluded |
| `date_of_birth` | Supported with a label | Field label | Pilot: covered |
| `face` | **Provisional.** Execution is feasible but accuracy is unmeasured | MediaPipe BlazeFace short-range | No consented face images have been evaluated. Not supported until they are |
| `machine_readable_code` | **Not supported** | None | No browser code detector integrated |

Identity documents, medical records, and financial statements as whole document types are out of scope. Individual fields above may still appear in them.

## Images

| Item | Decision |
| --- | --- |
| Formats | PNG and JPEG |
| Maximum file size | 20 MB |
| Maximum decoded pixels | 24 megapixels |
| Analysis resolution | Long side scaled to at most 2048 px |
| Orientation | EXIF orientation applied before analysis |
| Rotation | Text rotated more than a few degrees is **not supported** until deskewing is added. The pilot showed fragmented OCR and missed names at 7° |
| Outgoing artifact | Opaque-masked PNG, freshly rendered, with no metadata chunks |

These limits are provisional and will be checked against real phone photographs in Phase 2.

## Browser and device matrix

| Target | Status | Evidence |
| --- | --- | --- |
| Desktop Chromium 152 on Windows 11 (Intel integrated GPU reported as gen-12lp, 16 GB) | **Measured.** WASM path supported. WebGPU works for NER; WebGPU OCR and face paths use their own runtimes | `docs/FEASIBILITY_RESULTS.md` |
| Desktop Chrome stable, Edge, Firefox, Safari | Not measured | Required before the support claim in Phase 2 |
| Phone browsers (Android Chrome, iOS Safari) | **Not measured; no phone-web support claimed** | Requires real devices. The WASM path downloads 112.9 MB of model files plus 43.3 MB of runtime WASM, measured 2026-11-06. That must be checked against phone memory and storage limits |

WASM with SIMD is the reference backend because every stage runs on it. WebGPU is optional acceleration and must never be required.

## Grounding

Text-field grounding uses the deterministic text-anchor matcher over OCR (`text-anchor@1`). The open-vocabulary detector OWL-ViT (`Xenova/owlvit-base-patch32`) failed to create an inference session on both WebGPU and WASM with ONNX Runtime Web 1.31.0-dev. Visual object grounding is therefore not part of the first release. That is acceptable because every supported target is a printed text field. Segmentation is deferred for the same reason.

## Revisit triggers

- A face evaluation on consented images is completed.
- Deskewing or a rotation-robust OCR path is added.
- A phone browser is measured.
- A visual grounding model runs in the browser and a non-text target is proposed.
