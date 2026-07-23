/**
 * Truchet tiles. A grid where each cell is randomly one of two orientations;
 * across the grid the pieces join into flowing mazes. Two styles: quarter-arcs
 * (Smith tiles — continuous curves) or diagonals. Arcs are emitted as two open
 * polylines per tile, so the result plots as single strokes.
 */

import type { GeneratorDef, Params, GeneratorContext } from "../core/registry";
import type { Path, Point } from "../core/geometry";

/** Integer hash → [0,1). */
function hash2(ix: number, iy: number, seed: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 362437)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Sample a quarter arc centred at (cx,cy), radius r, from a→b (radians). */
function arc(cx: number, cy: number, r: number, a: number, b: number, segments: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = a + ((b - a) * i) / segments;
    pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  return pts;
}

const HALF_PI = Math.PI / 2;

export const truchet: GeneratorDef = {
  id: "truchet",
  name: "Truchet tiles",
  fields: [
    {
      key: "style",
      label: "Style",
      type: "select",
      options: [
        { value: "arcs", label: "Quarter arcs" },
        { value: "diagonal", label: "Diagonals" },
      ],
      default: "arcs",
    },
    { key: "tile", label: "Tile size", type: "range", min: 5, max: 40, step: 1, default: 16, unit: "mm" },
    { key: "margin", label: "Margin", type: "range", min: 0, max: 40, step: 1, default: 12, unit: "mm" },
    { key: "segments", label: "Arc resolution", type: "range", min: 4, max: 40, step: 1, default: 16 },
    { key: "seed", label: "Seed", type: "range", min: 1, max: 999, step: 1, default: 7 },
  ],
  generate(params: Params, ctx: GeneratorContext): Path[] {
    const style = params.style as string;
    const tile = Math.max(2, params.tile as number);
    const margin = params.margin as number;
    const segments = Math.max(2, Math.round(params.segments as number));
    const seed = Math.round(params.seed as number);

    const availW = ctx.pageWidth - margin * 2;
    const availH = ctx.pageHeight - margin * 2;
    if (availW <= tile || availH <= tile) return [];

    const cols = Math.floor(availW / tile);
    const rows = Math.floor(availH / tile);
    // Centre the grid block within the available area.
    const originX = margin + (availW - cols * tile) / 2;
    const originY = margin + (availH - rows * tile) / 2;

    const r = tile / 2;
    const paths: Path[] = [];

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x0 = originX + i * tile;
        const y0 = originY + j * tile;
        const x1 = x0 + tile;
        const y1 = y0 + tile;
        const flip = hash2(i, j, seed) < 0.5;

        if (style === "diagonal") {
          paths.push(
            flip
              ? { points: [{ x: x0, y: y0 }, { x: x1, y: y1 }], closed: false }
              : { points: [{ x: x0, y: y1 }, { x: x1, y: y0 }], closed: false },
          );
          continue;
        }

        // Quarter-arc tiles.
        if (flip) {
          // arcs at top-left and bottom-right corners
          paths.push({ points: arc(x0, y0, r, 0, HALF_PI, segments), closed: false });
          paths.push({ points: arc(x1, y1, r, Math.PI, Math.PI + HALF_PI, segments), closed: false });
        } else {
          // arcs at top-right and bottom-left corners
          paths.push({ points: arc(x1, y0, r, HALF_PI, Math.PI, segments), closed: false });
          paths.push({ points: arc(x0, y1, r, -HALF_PI, 0, segments), closed: false });
        }
      }
    }
    return paths;
  },
};
