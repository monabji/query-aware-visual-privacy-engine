# Product specification

## Goal and priorities

Enable a user to ask a question about a photo while sharing only reviewed content needed for the task and benign supporting context. Keep incidental private information on the client. Optimize for correct answers and dependable privacy handling before adding more features or reducing latency.

The user explicitly chose a web app, with possible phone and desktop wrappers later, and wants a publishable research contribution. An existing hosted VLM is permitted for answering sanitized requests. No specific VLM, provider, paid plan, dataset size, performance threshold, or UI style has been selected.

## First release scope

- Browser application with one still image and one typed question per session.
- Local image selection. Still-camera capture through the browser may follow if it uses the same pipeline.
- Explicitly declared language, task, image-format, device, and sensitive-category support.
- Local OCR and sensitive-text analysis, face detection, and query grounding sufficient for the chosen tasks.
- Barcode and document/ID handling added to the supported-category list only after the corresponding detector and evaluation exist.
- Separate representations of relevance and sensitivity, field-level conflict review, deterministic policy decisions, and opaque masking.
- Clean output encoding, metadata removal, outgoing-content checks, a reviewable preview, and explicit approval.
- One working hosted VLM integration through a server adapter. The adapter supports future model comparison without redesigning the privacy engine.
- Reset/cancel behavior, actionable failures, and measurement that excludes user content from logs.

Provisional starting tasks are product/package label reading, printed medicine-label transcription, and simple printed-document questions. Start with printed English/Latin text if feasibility supports it. These defaults require a recorded scope decision in Phase 1. Medicine examples concern visible text extraction, not diagnosis or clinical dosage advice.

Initial candidate categories are faces, personal names, addresses, phone/email details, identity/account numbers, and machine-readable codes. Identity documents and medical records can carry sensitivity beyond recognizable PII. A detector for a few text patterns does not establish broad document privacy support.

## Later extensions

Voice input with local transcription, live preview with temporal consistency, offline/local answering, phone/desktop wrappers, native accelerator access, multilingual text, optional inpainting, and domain-specific fine-tuning are subsequent work. CLIP/SigLIP analysis can be a secondary research metric. FAISS requires a retrieval use case before inclusion. These items are not prerequisites for the still-image core.

Do not add accounts, saved conversation history, remote image storage, a database, vector search, cloud raw-image analysis, or a desktop app as assumed MVP requirements.

## Main interaction

1. **Select:** Load the image into browser memory. Show supported formats and limits. Do not upload it on selection.
2. **Ask:** Accept the question and explain that the final reviewed question is sent with the image. A question may itself contain personal information.
3. **Analyze:** Run real local processing and show truthful progress. Display model download separately from image analysis. Allow cancellation.
4. **Resolve:** Identify sensitive fields that overlap with required evidence. Present the smallest disputed field or region and the effect of hiding it. Let the user keep it hidden, revise the task, crop, or explicitly permit that specific disclosure when policy allows.
5. **Prepare:** Apply masks, encode a new image, remove metadata, and run the outgoing checks. On failure, return to local review.
6. **Preview:** Show the exact outgoing image and question, destination provider, categories removed, specifically approved sensitive fields, and limits of the checks. Support zoom and accessible text explanations. Avoid repeating private strings in explanations.
7. **Approve and send:** One deliberate action approves this exact request. Image, query, crop, masks, destination, or processing changes invalidate it.
8. **Answer:** Display the hosted VLM answer. A model may abstain when the image does not support the requested detail. Show provider errors without exposing payloads and allow an approved sanitized retry.
9. **Reset:** Clear user content and temporary resources. Do not silently save a history.

## Example

The user asks, "What expiry date is printed on this medicine package?" The photo also contains a prescription bearing a name and address and a background face. The app identifies the package text as relevant, masks the personal fields and face, and preserves the expiry date and necessary label context. It checks the clean output and shows that image before sending it.

If a required date is inseparable from sensitive text, the app reports that conflict. It can request a clearer crop, ask the user to revise the question, or seek specific approval for the necessary field. It does not automatically unmask the prescription because the prescription is relevant. It does not invent an expiry date or manufacture label text through inpainting.

## Required states

Model download/loading, unsupported browser, unsupported language/image, ready, analyzing, review required, sanitizing, checking, preview ready, approved, sending, answered, canceled, and failed must have explicit behavior. Loading, failures, and empty detections are distinct states. Keep analysis asynchronous and cancel stale jobs after a new image or question.

## Acceptance criteria

- No image-selection, analysis, preview, logging, or telemetry request sends original files, private crops, OCR text, or raw questions before approval.
- Unavailable required processing blocks sharing and explains how to proceed locally.
- Relevance does not override sensitivity. Supported conflicts can be reviewed at field level.
- The outgoing image is a flattened clean artifact. The preview matches what is sent, including later resizing or encoding.
- The user can inspect the outgoing question and provider. Approval cannot be reused after changes or for hidden background calls.
- Hosted answers use the approved sanitized request and are real model outputs. Provider or validation failures never trigger raw-image fallback.
- Reset and cancellation stop pending work and clear references to user content as far as the app controls them.
- The supported categories, browser matrix, model revisions, and known failure modes are visible in project documentation.
- The MVP has measured privacy, answer-quality, and performance results under the protocol in `RESEARCH_PLAN.md`. Numeric release targets must be selected and recorded before evaluation, not invented in UI copy.
