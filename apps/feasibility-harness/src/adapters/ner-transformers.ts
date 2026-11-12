import {
  boxToPolygon,
  lineText,
  locateFragment,
  unionBoxes,
  wordsInSpan,
  type OcrResult,
  type Region,
  type SensitiveCategory,
} from "@qavpe/core";
import { pipeline, type TokenClassificationPipeline } from "@huggingface/transformers";
import { configureTransformers } from "./transformers-runtime.js";
import { StageError, timed, type AdapterInfo, type Backend, type LoadReport, type LocalAdapter, type ProgressListener } from "./types.js";

const MODEL_ID = "Xenova/bert-base-NER";
const REVISION = "8e892123e8b7c2c0c2bd1dcb598b7d244c4e53aa";

export const BERT_NER_INFO: AdapterInfo = {
  stage: "sensitive_text",
  id: "bert-base-ner",
  model: MODEL_ID,
  revision: REVISION,
  runtime: "Transformers.js 4.3.1 / ONNX Runtime Web",
  license: "MIT",
  assetHosts: ["huggingface.co", "*.hf.co"],
};

/** CoNLL-03 labels mapped to project categories. ORG and MISC are not personal data by themselves. */
const LABEL_TO_CATEGORY: Record<string, SensitiveCategory | undefined> = {
  PER: "person_name",
  LOC: "postal_address",
};

/**
 * Local named-entity recognition over OCR lines, complementing the
 * deterministic patterns for unlabelled names and places. Trained on news
 * text (English), so recall on labels and documents must be measured.
 */
export class BertNerAdapter implements LocalAdapter<OcrResult, Region[]> {
  readonly info = BERT_NER_INFO;
  private classifier: TokenClassificationPipeline | null = null;

  constructor(private readonly minScore = 0.6) {}

  async load(preferred: Backend, onProgress?: ProgressListener): Promise<LoadReport> {
    configureTransformers();
    const device = preferred === "webgpu" ? "webgpu" : "wasm";
    const { ms } = await timed(async () => {
      try {
        this.classifier = (await pipeline("token-classification", MODEL_ID, {
          revision: REVISION,
          device,
          dtype: device === "webgpu" ? "fp32" : "q8",
          progress_callback: (event: { status: string; progress?: number }) =>
            onProgress?.(event.progress === undefined ? null : event.progress / 100, event.status),
        })) as TokenClassificationPipeline;
      } catch (cause) {
        throw new StageError("sensitive_text", "MODEL_LOAD_FAILED", { cause });
      }
    });
    return { backend: device, loadMs: ms };
  }

  async run(ocr: OcrResult): Promise<Region[]> {
    if (!this.classifier) throw new StageError("sensitive_text", "NOT_LOADED");
    const regions: Region[] = [];
    for (const line of ocr.lines) {
      const text = lineText(line);
      let entities;
      try {
        entities = await this.classifier(text, { aggregation_strategy: "simple" });
      } catch (cause) {
        throw new StageError("sensitive_text", "INFERENCE_FAILED", { cause });
      }
      let cursor = 0;
      for (const entity of entities) {
        // Grouped output from this model omits character offsets; recover the
        // span by locating the entity text in order. An unlocatable entity is
        // a failure, never a silent skip.
        const span =
          entity.start !== undefined && entity.end !== undefined
            ? { start: entity.start, end: entity.end }
            : locateFragment(text, entity.word, cursor);
        if (!span) throw new StageError("sensitive_text", "UNMAPPABLE_ENTITY");
        cursor = span.end;
        const category = LABEL_TO_CATEGORY[entity.entity_group.replace(/^[BI]-/, "")];
        if (!category || entity.score < this.minScore) continue;
        const indices = wordsInSpan(line, span.start, span.end);
        if (indices.length === 0) continue;
        const bounds = unionBoxes(indices.map((i) => line.words[i]!.bounds));
        regions.push({
          id: `ner-${regions.length}`,
          kind: "sensitive",
          category,
          polygon: boxToPolygon(bounds),
          bounds,
          confidence: entity.score,
          source: this.info.id,
        });
      }
    }
    return regions;
  }

  async dispose(): Promise<void> {
    await this.classifier?.dispose();
    this.classifier = null;
  }
}
