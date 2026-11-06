import type { Point, Polygon } from "@qavpe/core";
import type { ElementAnnotation, PanelSpec, RenderedScene, SceneSpec } from "./types.js";

/** The subset of CanvasRenderingContext2D the renderer needs; keeps this package DOM-free. */
export type Canvas2D = {
  fillStyle: unknown;
  font: string;
  textBaseline: string;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(radians: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): {
    actualBoundingBoxLeft: number;
    actualBoundingBoxRight: number;
    actualBoundingBoxAscent: number;
    actualBoundingBoxDescent: number;
  };
};

/** Font stack chosen for broad availability; the rendered font is recorded by the harness. */
export const PILOT_FONT_FAMILY = "Arial, Helvetica, sans-serif";

function rotateAbout(point: Point, centre: Point, radians: number): Point {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - centre.x;
  const dy = point.y - centre.y;
  return { x: centre.x + dx * cos - dy * sin, y: centre.y + dx * sin + dy * cos };
}

function renderPanel(ctx: Canvas2D, panel: PanelSpec): ElementAnnotation[] {
  const radians = ((panel.rotationDeg ?? 0) * Math.PI) / 180;
  const centre = { x: panel.x + panel.width / 2, y: panel.y + panel.height / 2 };
  ctx.save();
  ctx.translate(centre.x, centre.y);
  ctx.rotate(radians);
  ctx.translate(-centre.x, -centre.y);
  ctx.fillStyle = panel.fill;
  ctx.fillRect(panel.x, panel.y, panel.width, panel.height);

  const annotations: ElementAnnotation[] = [];
  for (const element of panel.elements) {
    ctx.font = `${element.fontWeight ?? "normal"} ${element.fontSize}px ${PILOT_FONT_FAMILY}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = element.color ?? "#1b1b1b";
    ctx.fillText(element.text, element.x, element.y);
    const metrics = ctx.measureText(element.text);
    const left = element.x - metrics.actualBoundingBoxLeft;
    const right = element.x + metrics.actualBoundingBoxRight;
    const top = element.y - metrics.actualBoundingBoxAscent;
    const bottom = element.y + metrics.actualBoundingBoxDescent;
    const polygon: Polygon = [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ].map((corner) => rotateAbout(corner, centre, radians));
    annotations.push({
      elementId: element.id,
      role: element.role,
      ...(element.category ? { category: element.category } : {}),
      polygon,
    });
  }
  ctx.restore();
  return annotations;
}

/**
 * Draw a scene onto a canvas sized `scene.width × scene.height` and return
 * ground-truth polygons measured from the actual rendered font metrics.
 */
export function renderScene(ctx: Canvas2D, scene: SceneSpec): RenderedScene {
  ctx.save();
  ctx.fillStyle = scene.background;
  ctx.fillRect(0, 0, scene.width, scene.height);
  ctx.restore();
  const annotations = scene.panels.flatMap((panel) => renderPanel(ctx, panel));
  return { sceneId: scene.id, width: scene.width, height: scene.height, annotations };
}
