# Related-work comparison

Status: Phase 1 working comparison, 2026-11-06. This is a positioning record, not a literature review fit for a manuscript. Each entry states how much of the source has been checked. Entries marked "snippet only" come from search results and must be read in full before any claim relies on them. Do not repeat numeric results from this file in a paper without checking the primary source.

## Search log

| Date | Query | Mode | New leads |
| --- | --- | --- | --- |
| 2026-11-06 | query-aware image redaction privacy vision-language model sanitize before upload | Web, extended | ACM MM 2025 reversible privacy; arXiv 2604.09695; VIP (arXiv 2507.08982) |
| 2026-11-06 | ReVision privacy-preserving task-oriented visual instruction rewriting | Web, standard | Venue confirmation: IJCNLP-AACL 2025 |
| 2026-11-06 | privacy-preserving VQA selective redaction task-relevant regions VLM 2025 2026 arXiv | Web, extended | arXiv 2609.15671 (question-guided token pruning); arXiv 2512.18264 |

Still to search: arXiv and ACL/CVF directly for "task-aware image redaction", "region-level privacy masking VQA", "selective visual disclosure", "contextual integrity vision-language", and uncertainty-based abstention for privacy. Add a Semantic Scholar citation sweep from each close paper.

## Closest work

| Work | What it does | Checked | Difference from this project |
| --- | --- | --- | --- |
| ReVision (Mishra et al., IJCNLP-AACL 2025; [ACL Anthology](https://aclanthology.org/2025.ijcnlp-long.154/), [arXiv 2502.14780](https://arxiv.org/abs/2502.14780)) | An on-device compact VLM rewrites an image and instruction into a text-only instruction, so that the image does not go to the cloud | Abstract and venue confirmed 2026-10-22 and 2026-11-06; full paper not yet read | The output is text, not a sanitized image. The rewritten text can itself carry private facts. It is our text-rewriting baseline where tasks can be expressed in text |
| Don't Send What You Don't Need: question-guided token pruning ([arXiv 2609.15671](https://arxiv.org/html/2609.15671)) | Selects visual tokens to transmit using question relevance and a learned sensitivity signal, in a distributed VLM with a LoRA-adapted LLaVA-1.5-7B | Snippet only | **Closest on the relevance-plus-sensitivity idea.** It requires a modified model and transmits tokens. We send a reviewable pixel artifact to an unmodified hosted VLM and treat a relevant sensitive field as an explicit conflict instead of a pruning score. The novelty claim must be framed against this paper after a full read |
| Assessing privacy preservation and utility in online VLMs ([arXiv 2604.09695](https://arxiv.org/pdf/2604.09695)) | Uses VLMs to estimate how strongly an image relates to PII, then removes or masks sensitive objects while measuring utility | Snippet only | Not query-conditioned in the snippet. If its PII estimation uses a remote VLM on the original, it crosses our trust boundary. Must check its pipeline and metrics |
| Reversible privacy preserving on VLMs (ACM MM 2025; [DOI 10.1145/3746027.3755068](https://dl.acm.org/doi/pdf/10.1145/3746027.3755068)) | Redacts with mosaicing and uses a jointly optimized image and text key so that only authorized queries recover private answers | Snippet only | Reversible obfuscation for authorized access, not minimisation of what a third-party model receives. Mosaicing is not an opaque mask |
| VIP ([arXiv 2507.08982](https://arxiv.org/pdf/2507.08982)) and Who Can See Through You? ([arXiv 2512.18264](https://www.arxiv.org/pdf/2512.18264)) | Adversarial perturbations that stop VLMs from perceiving or answering about protected regions | Snippet only | Model-specific and possibly not transferable to an arbitrary hosted VLM. Pixels remain present for other models or for people. We remove pixels |
| Connecting Pixels to Privacy and Utility (Orekondy et al., CVPR 2018; [DOI 10.1109/CVPR.2018.00883](https://doi.org/10.1109/CVPR.2018.00883)) | Automatic private-region redaction with a privacy–utility trade-off | Listed in deck; not re-read | Not conditioned on a user's question. Fixed-category redaction is our primary baseline |

## Components, not competitors

Grounding DINO, OWL-ViT, Segment Anything, and LaMa provide localisation, masks, or inpainting. They carry no privacy policy. The deck's query-first video retrieval and privacy-aware SQL papers are conceptual inspiration with different objectives. See `RESEARCH_PLAN.md` for the full queue.

## Working difference statement

This is a hypothesis to test, not an established novelty claim:

> Browser-local, field-level resolution of independent relevance and sensitivity, with explicit conflict review and abstention, producing a single reviewable opaque-masked image for an unmodified hosted VLM, evaluated on paired questions per scene against fixed redaction, relevance-only cropping, a naive relevance exemption, and text rewriting.

The token-pruning paper (arXiv 2609.15671) is the main threat to this statement. Before Phase 5, read it in full and record:

1. whether its sensitivity signal operates at field level and whether relevant sensitive content can still be withheld;
2. whether it needs model changes or server-side access to the original;
3. its benchmark and metrics, and whether paired-query or conflict cases exist;
4. whether its method can serve as a baseline under our trust boundary.

The other gaps that may support a contribution are measured browser-local execution, an inspectable deterministic policy, and a paired-query conflict benchmark. Each requires evidence from Phases 3–5.
