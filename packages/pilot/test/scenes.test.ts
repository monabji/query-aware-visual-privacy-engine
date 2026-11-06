import { parseQueryIntent } from "@qavpe/core";
import { describe, expect, it } from "vitest";
import { renderScene, type Canvas2D } from "../src/render.js";
import { PILOT_SCENES } from "../src/scenes.js";

const elementsOf = (sceneId: string) =>
  PILOT_SCENES.find((s) => s.id === sceneId)?.panels.flatMap((p) => p.elements) ?? [];

describe("pilot scene integrity", () => {
  it("has unique scene ids and unique element ids within each scene", () => {
    expect(new Set(PILOT_SCENES.map((s) => s.id)).size).toBe(PILOT_SCENES.length);
    for (const scene of PILOT_SCENES) {
      const ids = elementsOf(scene.id).map((e) => e.id);
      expect(new Set(ids).size, scene.id).toBe(ids.length);
    }
  });

  it("asks at least two questions per scene (paired queries)", () => {
    for (const scene of PILOT_SCENES) expect(scene.questions.length, scene.id).toBeGreaterThanOrEqual(2);
  });

  it("references only existing elements and marks conflicts only on sensitive evidence", () => {
    for (const scene of PILOT_SCENES) {
      const elements = new Map(elementsOf(scene.id).map((e) => [e.id, e]));
      for (const q of scene.questions) {
        for (const id of q.requiredEvidence) expect(elements.has(id), `${scene.id}/${q.id}/${id}`).toBe(true);
        for (const id of q.expectedConflicts) {
          expect(q.requiredEvidence).toContain(id);
          expect(elements.get(id)?.role).toBe("sensitive");
        }
      }
    }
  });

  it("gives every sensitive element a category", () => {
    for (const scene of PILOT_SCENES) {
      for (const e of elementsOf(scene.id)) if (e.role === "sensitive") expect(e.category, `${scene.id}/${e.id}`).toBeDefined();
    }
  });

  it("uses only fabricated contact values", () => {
    for (const scene of PILOT_SCENES) {
      for (const e of elementsOf(scene.id)) {
        if (e.category === "phone_number") expect(e.text).toMatch(/07700 900\d{3}/);
        if (e.category === "email_address") expect(e.text).toMatch(/@example\.(com|org)$/);
      }
    }
  });

  it("matches the expected local intent for each question", () => {
    for (const scene of PILOT_SCENES) {
      for (const q of scene.questions) {
        const intent = parseQueryIntent(q.question);
        const target = intent.task === "read_text_field" ? intent.target : null;
        expect(target, `${scene.id}/${q.id}`).toBe(q.expectedTarget);
      }
    }
  });
});

describe("renderScene", () => {
  function fakeContext(): Canvas2D {
    return {
      fillStyle: "",
      font: "",
      textBaseline: "",
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      fillRect() {},
      fillText() {},
      measureText: (text: string) => ({
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: text.length * 10,
        actualBoundingBoxAscent: 20,
        actualBoundingBoxDescent: 5,
      }),
    };
  }

  it("emits one annotation per element with measured bounds", () => {
    const scene = PILOT_SCENES[0]!;
    const rendered = renderScene(fakeContext(), scene);
    expect(rendered.annotations).toHaveLength(scene.panels.flatMap((p) => p.elements).length);
    const product = rendered.annotations.find((a) => a.elementId === "product");
    expect(product?.polygon[0]).toEqual({ x: 90, y: 100 });
  });

  it("rotates polygons of rotated panels about the panel centre", () => {
    const scene = PILOT_SCENES.find((s) => s.id === "rotated-sticker")!;
    const patient = renderScene(fakeContext(), scene).annotations.find((a) => a.elementId === "patient");
    const [topLeft, topRight] = patient!.polygon;
    // Counter-clockwise rotation in screen space raises the right end of the top edge.
    expect(topRight!.y).toBeLessThan(topLeft!.y);
  });
});
