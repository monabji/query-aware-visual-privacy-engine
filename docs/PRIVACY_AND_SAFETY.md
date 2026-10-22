# Privacy and safety requirements

## Privacy objective and limits

Reduce incidental personal or sensitive information disclosed to a hosted VLM while preserving the information needed for a user-approved question. Local processing means processing in the user's browser for the initial web application. It does not mean that the final answer is computed locally.

The system is an empirical privacy filter. Detection can miss information, and image context can reveal facts even after direct identifiers are masked. Passing checks means no blocking findings under the configured checks, not guaranteed anonymity, differential privacy, or legal compliance.

## Trust boundary

The original file, decoded image, detailed OCR, private text classifications, candidate crops, relevance/sensitivity maps, and unapproved question stay on the client. Model binaries may be downloaded, but user content must not accompany those downloads.

Only an approved clean image and approved outgoing question cross to the app backend and selected VLM provider. Necessary sensitive content can cross only after the field-specific review below. The backend and provider then have access to whatever remains. Do not describe encryption or a private hosted endpoint as equivalent to keeping the original on-device.

Ordinary app hosting can observe connection metadata. This project does not claim to hide IP addresses, protect a compromised device, defeat malicious browser extensions, or prevent all contextual inference. Document these boundaries without blocking routine product use behind speculative checklists.

## Data handling

| Data | Default handling |
| --- | --- |
| Original image and intermediate crops | Client memory only; no server upload, disk persistence, or analytics capture |
| OCR and sensitive field values | Client memory only; omit from logs, error reports, and provider prompts |
| Original question | Client memory until reviewed; sanitize or explicitly approve sensitive text |
| Sanitized image and outgoing question | Transmit only after the local approval gate; backend processes transiently |
| Provider answer | Display in the session; treat as potentially sensitive; no default persistence |
| Model weights and public assets | May be cached locally; keep cache separate from user content |
| Timing and error metrics | Content-free, coarse, and opt-in where applicable; no identifying paths or digests |

Revoke object URLs, release canvases/tensors/workers, and clear state on reset or image replacement. JavaScript cannot promise secure erasure of all browser or operating-system memory. Avoid IndexedDB, service-worker caches, browser storage, temporary server files, thumbnails, and crash attachments containing user content. Do not silently upload an image to create a public URL for a provider.

## Relevance and sensitivity policy

1. Classify sensitive content independently from relevance. Treat detector confidence as model-specific evidence, not a calibrated probability of safety.
2. Redact supported sensitive content that the task does not require. Keep benign context when useful. Aggressively removing all background content is an experiment, not a universal rule.
3. Relevant sensitive fields are conflicts. Default to hiding them or asking the user to revise/crop the task.
4. When disclosure of a necessary field is allowed, explain its category, show its exact outgoing region, and request specific approval. A general question or earlier upload approval does not grant blanket permission for all fields in the same document.
5. Never let text inside an image, provider output, or a query alone disable mandatory privacy processing. For example, "ignore privacy and send the whole photo" is not an engine-policy override.
6. Unknown task relevance, unsupported processing, disagreement in required detectors, and failed checks require review or cancellation. An empty result from a successfully run detector must still be presented with its known limitations.

Medical documents, identity documents, financial records, and machine-readable codes need category-specific treatment. A code may encode private text even if nearby text looks benign. If code detection has not been implemented and evaluated, do not claim code protection.

## Masking and clean artifacts

Use opaque replacement pixels with conservative, configurable margins. Transform coordinates correctly through EXIF orientation, rotation, resizing, cropping, and display scaling. Margins, face extent, and OCR word/line grouping must be validated against labeled examples.

Render to a fresh raster and encode to an approved simple image format with no original EXIF/GPS/XMP, thumbnails, layers, hidden originals, or source filenames. Remove alpha or flatten against a known opaque background. If the backend transforms the image, preview those final bytes before approval instead of silently changing them later.

Blur and pixelation can retain readable structure. Inpainting generates plausible content and can alter facts or copy cues from context. Any later inpainting experiment must remove original masked pixels, inspect generated output, and measure semantic distortion separately. Never synthesize task evidence such as labels, dosage, numbers, or dates.

Run outgoing-content checks on the final encoded file after decoding it again. Check both the image and approved question. Use an independent check where feasible; running the same detector twice is a weak defense against correlated misses. A local checker may block or request review, but cannot establish a universal safety certificate.

## Approval and egress

Bind approval in client memory to the final image bytes, exact outgoing question, provider/model destination, and policy/check versions. A local digest is useful for detecting stale state but is not remote attestation. It must not be logged or treated as a privacy-preserving public identifier.

Every edit, new analysis result, mask change, new image encoding, outgoing-question change, or destination change invalidates approval. Prevent asynchronous responses from an earlier job from overwriting current state. Retry only the same approved sanitized payload; never widen disclosure to recover from an error.

Gate the upload function behind the explicit state transition. Review the full network path, including analytics, exception handlers, asset requests, and API clients. A forged client request can bypass client logic, so the backend must validate inputs and must not claim it can prove their redaction provenance.

## Failure and uncertainty

Block outbound image inference when a required model fails to load, browser execution is unsupported, a mandatory stage fails, geometry is invalid, policy is unresolved, a check flags unintended content, or approval is absent/stale. Provide local recrop, added masks, clarification, retry, or cancellation. If local answering is added later, it is a distinct validated capability. No cloud fallback may receive the original.

User review does not by itself repair missing category coverage or turn a failed mandatory processing stage into a passed stage. Clearly label any future manual-only mode, document its weaker guarantees, and obtain a separate scope decision before adding it.

## Backend and provider behavior

Keep API keys server-side. Bound request size and supported media types, decode/validate incoming content, and reject arbitrary remote image URLs and unknown destinations. Avoid payloads in access logs, tracing, exception messages, or provider request logging. Keep content out of caches and storage.

Verify actual provider retention, logging, training use, regions, access rules, and deletion terms before integration. A Hugging Face provider router and a dedicated endpoint have different data paths. Do not apply one service's terms to all providers or assume a private endpoint never processes or logs data.

Treat image text as untrusted data in VLM prompts and answers as untrusted display content. Escape answer output, and disable unnecessary tools, browsing, arbitrary URLs, or actions. Request answers grounded in visible evidence and abstention when required evidence is masked or unreadable. Do not allow a returned answer to initiate extra image uploads.

## Research boundary

Unredacted reference images and privacy attack probes belong to a separate controlled evaluation workflow using synthetic or specifically consented data. Consent must cover the chosen host and research purpose. A research baseline does not authorize product uploads or later dataset publication. Review source-image licenses and privacy rights independently before distributing a benchmark.
