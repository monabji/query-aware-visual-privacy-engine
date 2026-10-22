# Research plan

## Objective and evidence status

Study whether a local, query-aware disclosure policy can reduce incidental sensitive leakage while retaining task accuracy better than fixed redaction at comparable privacy levels. The product is a web application; the scientific contribution must be supported by method, benchmark, and experiments. Neither publication nor novelty is established by this documentation.

The deck and chat motivate the work. They contain proposals and literature summaries, not measured project results. The claim that no existing work combines query relevance with privacy is unverified. Conduct a current related-work review before framing the manuscript or fixing the contribution.

## Contribution hypotheses

1. **Conflict-aware disclosure:** Independent relevance and sensitivity estimates, combined with field-level decisions, outperform a naive relevant-region exemption. A name inside a relevant prescription remains private unless specifically needed and approved.
2. **Selective sharing:** A policy that can request clarification or abstain can improve useful safe-answer coverage under a defined leakage tolerance. Its benefit must include the cost of blocked requests and user interventions.
3. **Paired-query benchmark:** Different questions about the same image require different minimal evidence and sometimes different disclosure decisions. Such pairs can measure query-awareness directly.
4. **Practical local execution:** A measured browser implementation can demonstrate quality, compatibility, and resource costs without sending raw inputs to a server. A browser UI over remote raw-image processing does not establish this result.

These are candidate contributions. Reusing pretrained OCR, detectors, segmenters, or VLMs is acceptable. Connecting their APIs alone is insufficient evidence of scientific novelty.

## Method to investigate

Represent task relevance `R` and sensitivity `S` independently, at OCR-field and visual-region granularity. Let a policy choose an action `a` from masking, preserving benign evidence, requesting a clearer input, asking for specific disclosure approval, or abstaining.

Study maximizing answer utility `U(a)` subject to empirical unintended leakage `L(a) <= epsilon`, while reporting coverage, intervention cost, and latency. `epsilon` is an operational evaluation threshold, not a differential-privacy parameter or a mathematical guarantee. Thresholds must be chosen using development/validation data and frozen before the held-out evaluation.

Implement a transparent rule-based policy first. If it does not outperform strong baselines, revise the method instead of claiming novelty from more components. Learned risk/utility scoring is optional after a reproducible baseline and error analysis exist.

## Source deck map

Reviewed all 14 slides in actual presentation order, including the image-only problem statement and native comparison table. Internal PPTX filenames have a different ordering from the visible deck. No substantive speaker notes were present.

| Visible slide | Content and how it informs this project |
| --- | --- |
| 1 | PRISM worklet 26LAI21, VIT team and project identity. Personal contact details are unnecessary in agent instructions. |
| 2 | Original worklet brief: local sanitization of uploads/live preview from voice queries; medicine/prescription example; preserve Q&A/embeddings; leakage and latency KPIs; six-month milestones; ReVision reference. |
| 3 | Visual-assistant privacy motivation, Samsung context, and regulatory assertions. Verify legal/product claims from primary sources before using them in a paper. |
| 4 | Private-region redaction and text-PII policy literature. Useful baselines, not evidence that their latency transfers to phone images. |
| 5 | Grounding DINO and efficient remote-sensing grounding. Relevant localization ideas, with domain and mobile-runtime limitations. |
| 6 | SAM and LaMa. Segmentation and completion components have no built-in privacy or answer-correctness guarantee. |
| 7 | Query-first video retrieval and privacy-aware SQL/querying. Conceptual inspiration, not direct visual privacy baselines. |
| 8 | Eight-paper comparative table combining stages and limitations. Use as a starting literature map, not an exhaustive survey. |
| 9 | Google, Presidio, Rekognition, and face-blur market comparison. Recheck actual capabilities before comparative claims. |
| 10 | Proposed gap: relevance-aware redaction, utility preservation, temporal consistency, fallback, leakage/latency. Later chat narrows the initial scope. |
| 11 | Candidate software/hardware. These are options, not requirements to install every listed model. |
| 12 | Professor Comments, blank. Do not invent feedback. |
| 13 | Eight references. Bibliographic entries and statistics need primary-source verification before reuse. |
| 14 | Closing slide, no additional technical requirements. |

Source file: `/home/manav4477/deadface/Query_Aware_Visual_Privacy_Engine_PRISM_v2.pptx`, outside the repository. The deck's six-month outline suggests early study and baseline work, preparation by month two, development/evaluation around month four, and closure by month six. `phases.md` adapts that outline to the user's accepted web-first direction.

## Related-work queue

The deck names the following work. Links are source leads. Do not repeat numeric claims, author lists, page ranges, or deployment conclusions without checking the actual primary source.

| Work | Relationship | Source lead |
| --- | --- | --- |
| Connecting Pixels to Privacy and Utility, CVPR 2018 | Private-region redaction and privacy–utility evaluation | https://doi.org/10.1109/CVPR.2018.00883 |
| SaaS API Monitoring for Data Leakage and Access Anomalies, IEEE Access 2026 | Text PII scoring and policy; different workload | https://doi.org/10.1109/ACCESS.2026.3683585 |
| Grounding DINO, ECCV 2024 | Query/object grounding, not privacy policy | https://doi.org/10.1007/978-3-031-72970-6_3 |
| Enhanced Grounding DINO, IEEE JSTARS 2025 | Efficient grounding in a different image domain | https://doi.org/10.1109/JSTARS.2025.3575770 |
| Segment Anything, ICCV 2023 | Promptable masks | https://doi.org/10.1109/ICCV51070.2023.00371 |
| Resolution-Robust Large Mask Inpainting with Fourier Convolutions, WACV 2022 | Completion baseline; verify deck bibliography | https://openaccess.thecvf.com/content/WACV2022/html/Suvorov_Resolution-Robust_Large_Mask_Inpainting_With_Fourier_Convolutions_WACV_2022_paper.html |
| Query-Aware Path Inference from Spatial Videos, PACMMOD 2025 | Query-first retrieval, different objective | https://doi.org/10.1145/3769817 |
| Privacy-Aware ML Framework for Dynamic Query Formation, IJACSA 2025 | Tabular query/privacy trade-off | https://thesai.org/Downloads/Volume16No9/Paper_47-Privacy_Aware_ML_Framework_for_Dynamic_Query_Formation.pdf |

The image-only brief additionally cites **ReVision: A Dataset and Baseline VLM for Privacy-Preserving Task-Oriented Visual Instruction Rewriting**. Its official ACL entry describes converting image-plus-instruction inputs into text-only instructions with a compact VLM. This is closely related task-oriented privacy work and must be considered when defining novelty. It is not the same output representation as sanitized images. [Official paper](https://aclanthology.org/2025.ijcnlp-long.154/), checked 2026-10-22.

Use a text-only rewriting baseline on tasks where comparable evidence can be represented in text. Do not assume rewritten text is private: measure sensitive facts in that output too. Review the [authors' repository](https://github.com/abhijitmishra/visual_instruction_rewriting) and source-image licenses before dataset reuse. Broaden the search to query-conditioned image redaction, selective visual disclosure, privacy-preserving VQA, and uncertainty-based sharing. Record queries, dates, included papers, and differences from this method.

## Dataset design

Use synthetic personal fields, appropriately licensed source material, and specifically consented images. Image-use permission, provider-processing permission, and public redistribution are separate questions. Avoid collecting real identity cards, prescriptions, or financial records merely to make a convincing demo.

For each example record: scene/image ID, source/license/consent provenance, task/question, minimal required evidence, expected answer and accepted variants, sensitive entities with masks/polygons and categories, which fields are necessary, intended allowed disclosures, language, image quality, and split. Keep actual sensitive strings in a controlled evaluation store, never in product telemetry.

Include paired questions per scene and deliberate relevance/privacy overlaps. Cover small/rotated text, glare, low light, clutter, multiple faces, false-positive names, codes, unfamiliar documents, unsupported languages, and questions that cannot be answered safely. Include ordinary nonsensitive images so over-redaction is measurable.

Pilot annotations before selecting a final dataset size. Use independent review for ambiguous region boundaries, required evidence, and correct answers. Keep scenes, identities, document templates, and related image variants grouped within one split to avoid leakage. Include held-out templates/entities where practical. Freeze the test split before tuning.

## Required comparisons

| Baseline or ablation | What it tests |
| --- | --- |
| Original image, controlled research only | Answer reference and exposure upper bound |
| Fixed privacy-category opaque redaction | Whether query conditioning adds value |
| Query crop or blanket removal outside the target | Whether grounding alone is sufficient |
| Naive exemption of all relevant regions | The failure of conflating relevance with permission |
| Proposed field-level conflict policy | Primary method |
| Proposed policy without final checking | Value of the output checker |
| Proposed policy without uncertainty/abstention | Safety and coverage effects of selective sharing |
| Text-only task rewriting where applicable | Relationship to ReVision-style representation |
| Optional inpainting vs opaque masks | Effect on leakage, factual distortion, and task accuracy |

Use the same data, hosted answer model, prompt, resolution policy, and decoding settings for the primary policy comparison. Model comparisons are a separate experimental axis. Distinguish detector quality from policy quality with an oracle-mask experiment where feasible.

## Evaluation requirements

Follow the definitions and run manifests in [MODEL_AND_EVALUATION.md](MODEL_AND_EVALUATION.md). Report sensitive-region recall, recoverable private entities, task accuracy, retained necessary evidence, coverage/abstention, user intervention rate, redacted area, and browser resource/latency measurements.

Primary evidence is the privacy–utility frontier at matched conditions. Include all cases in coverage and success denominators. Report conditional accuracy among answered requests alongside overall useful safe-answer rate. A system that blocks everything must not look successful. Compare automatic runs and human-reviewed runs separately.

Use independent OCR or controlled attack probes on sanitized output where permitted. Keep attacker models separate from tuning and human-review a sample of disputed recoveries. Evaluate inference of private facts from visible context as a separate measured risk. Do not turn attack calls into a product feature.

Report per-category and per-slice failures, confidence intervals, model revision uncertainty, and cold/warm timing. CLIP/SigLIP similarity is secondary: preserving the whole image embedding can preserve private cues and is not proof of good task accuracy or privacy. Do not call a sensitivity score a formal privacy budget.

## Publication package and claim gates

Before asserting novelty, complete the related-work comparison. Before claiming local execution, measure the declared browser/device matrix and inspect network behavior. Before claiming quality gains, freeze thresholds, use a held-out benchmark, and report baselines/ablations with uncertainty.

Produce a reproducible method description, system diagram, model/config manifests, benchmark/data statement, annotation guide, failure analysis, runtime report, and manuscript with limitations. Publish only distributable data and artifacts. No measured results, selected venue, final sample size, formal privacy guarantee, or successful benchmark run exists yet.
