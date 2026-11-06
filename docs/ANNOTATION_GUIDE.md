# Pilot annotation guide

Status: version 1, 2026-11-06. Applies to the Phase 1 synthetic pilot (`packages/pilot`, `pilot-scenes@1`) and is the starting point for consented and licensed Phase 5 data. Revise it when pilot review shows ambiguity. Record every revision in this file and in `docs/DECISIONS.md` when it changes a metric definition.

## Purpose

Annotations let us measure two things independently for each image and question. **Sensitivity** records what must stay private. **Relevance** records what the question needs. An element can be both. That overlap is a conflict for the policy to resolve; it is never resolved by annotation.

## Data rules

- Use synthetic content, licensed source material, or images with consent that covers the processing host and the research purpose. The Phase 1 pilot is synthetic only.
- Use fabricated personal values. Names include "Fictional", "Sample", or "Placeholder". Phone numbers use the UK Ofcom drama range (07700 900000–900999). Email addresses use `example.com` or `example.org` (RFC 2606). Do not copy real prescriptions, identity documents, or account records to make a scene look convincing.
- Keep real sensitive strings from consented data in the controlled evaluation store only. Never put them in product telemetry, commits, issue trackers, or reports.
- Image-use permission, provider-processing permission, and redistribution permission are separate. Record each.

## Element roles

| Role | Meaning | Masking it counts as |
| --- | --- | --- |
| `sensitive` | Content that must not be disclosed unless specifically approved for the question | Correct protection |
| `evidence` | Benign content that at least one question needs | Evidence damage |
| `benign` | Context that can be kept and that no question needs | Over-redaction |

Annotate the role of the element itself, independent of any question. Question-specific needs belong in the question record.

## Sensitive categories

| Category | Includes | Notes |
| --- | --- | --- |
| `face` | Any human face, including partial or background faces | Box covers forehead to chin and ear to ear, including hair close to the face |
| `person_name` | Personal names with or without a label | Excludes product, brand, and organisation names |
| `postal_address` | Street, town, and postcode lines | Each line is a separate element in the same category |
| `phone_number` | Personal phone numbers | A public business helpline is `benign` and is an over-redaction probe |
| `email_address` | Personal email addresses | Generic organisational addresses are `benign` |
| `identifier_number` | Member, account, prescription, record, and reference numbers | Batch and lot numbers on products are `evidence` or `benign`, not identifiers |
| `date_of_birth` | Birth dates, with or without a label | Expiry and manufacture dates are not birth dates |
| `machine_readable_code` | Barcodes, QR codes, and data matrices | Reserved. Not annotated in `pilot-scenes@1` because no code detector exists yet |

## Geometry

- Coordinates are canonical pixels of the upright decoded image, origin top-left.
- Each element is one polygon around the full ink extent of its text line or object. Rotated elements use a rotated quadrilateral, not an axis-aligned box.
- In synthetic scenes, the renderer computes polygons from the browser's actual font metrics at render time. Polygons are therefore exact for the browser that rendered them. Record the browser when comparing results across machines.
- Hand annotation of photographs uses the tightest polygon that contains every pixel of the element. Disputed boundaries go to a second annotator.

## Question records

Each scene has at least two questions so that results can be compared across questions about the same image. Each question records:

| Field | Meaning |
| --- | --- |
| `question` | Exact question text |
| `expectedTarget` | Expected parser target, or `null` when the question is outside the supported schema |
| `expectedAnswer` | Ground-truth answer, or `null` when the image cannot answer it |
| `requiredEvidence` | Minimal element ids needed to answer |
| `expectedConflicts` | Required elements that are also `sensitive` |

Include unanswerable questions, questions outside the supported scope, and questions whose evidence overlaps sensitive content.

## Scoring definitions used by the Phase 1 harness

These are provisional diagnostics for feasibility, not release gates. Gate selection follows `docs/MODEL_AND_EVALUATION.md`.

| Measure | Definition |
| --- | --- |
| Sensitive covered | Masks cover at least 98% of the element's axis-aligned bounds |
| Evidence damaged | Masks cover more than 10% of a required or evidence element |
| Benign over-redacted | Masks cover more than 50% of a benign element |
| Evidence grounded | Relevance regions cover at least 80% of each required element |
| Correctly empty | No relevance region is returned for a question whose evidence is absent |

Axis-aligned bounds of rotated elements include background corners, so the 98% coverage requirement is stricter for rotated text than for upright text.

## Review

A second reviewer checks every new scene for role, category, required evidence, and answer before the scene enters a dataset version. Pilot findings that reveal an ambiguous rule update this guide before more data are annotated.
