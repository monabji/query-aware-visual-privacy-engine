# Development setup

## Requirements

- Node.js 24 (see `.nvmrc`; 22 or later is supported) and npm 11.
- A Chromium-based desktop browser for the feasibility harness. Other browsers are part of the support matrix in `docs/SCOPE.md` and may lack WebGPU or memory measurement.

## Install

```bash
npm install
```

## Checks

```bash
npm run typecheck
```

```bash
npm test
```

`npm test` runs the Vitest suites for `@qavpe/core` (geometry, sensitive-text detection, intent parsing, grounding, mask planning, container inspection, statistics) and `@qavpe/pilot` (scene integrity and render geometry).

## Feasibility harness

```bash
npm run harness
```

Open `http://localhost:5173`. Then:

1. **Load models.** The first load downloads model weights and language data from the hosts listed in `research/manifests/models.json` and caches them in the browser. Later loads come from the cache. Runtime code (OCR worker and core, MediaPipe and ONNX Runtime WASM) is served from the dev server.
2. **Run pilot.** This renders the synthetic scenes, runs every local stage, scores the results against render-time ground truth, builds clean artifacts, and checks them.
3. **Download report JSON.** The report contains environment details, timings, counts, and network summaries. It contains no image content or text. Committed results record the browser engine and version in place of the raw user-agent string.

The report's `harnessRevision` is the commit at dev-server start. Restart the server after committing so that recorded runs carry the correct revision. Keep the browser window visible during measurement, because background tabs are throttled.

To compare backends, reload the page and choose WebGPU or WASM before loading. A failed model session can affect later sessions in the same page, so measure each backend in a fresh page. To measure a cold start, clear the site's storage in the browser's developer tools before loading.

The dev server sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. These headers enable threaded WASM and whole-page memory measurement. The page's Content-Security-Policy limits network access to this origin and the declared model-asset hosts.

## Repository layout

| Path | Contents |
| --- | --- |
| `packages/core` | Shared contracts and pure, environment-independent logic, with tests |
| `packages/pilot` | Synthetic pilot scenes, renderer, and integrity tests |
| `apps/feasibility-harness` | Phase 1 browser harness: local model adapters, pipeline, measurement |
| `research/manifests` | Pinned model and dataset manifests |
| `research/results` | Content-free measured results |
| `docs` | Project documentation |
