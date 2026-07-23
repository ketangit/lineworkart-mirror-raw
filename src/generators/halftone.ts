/**
 * Halftone. A grid of cells whose ink density encodes a value sampled from a
 * field (linear gradient, radial, or value noise). Because a plotter can only
 * draw strokes — not filled dots — density is rendered as a growing circle, a
 * stack of concentric rings, or a single spiral fill, all of which plot cleanly.
 */

import type { GeneratorDef, Params, GeneratorContext } from "../core/registry";
import type { Path, Point } from "../core/geometry";
import { valueNoise } from "../core/noise";

const TWO_PI = Math.PI * 2;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

function circle(cx: number, cy: number, r: number, segments: number): Path {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (TWO_PI * i) / segments;
    points.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  return { points, closed: true };
}

function spiral(cx: number, cy: number, rMax: number, turns: number, segments: number): Path {
  const points: Point[] = [];
  const steps = Math.max(8, Math.round(segments * turns));
  const thetaMax = TWO_PI * turns;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const theta = thetaMax * f;
    const r = rMax * f;
    points.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
  }
  return { points, closed: false };
}

export const halftone: GeneratorDef = {
  id: "halftone",
  name: "Halftone",
  fields: [
    {
      key: "source",
      label: "Value field",
      type: "select",
      options: [
        { value: "linear", label: "Linear gradient" },
        { value: "radial", label: "Radial" },
        { value: "noise", label: "Value noise" },
      ],
      default: "radial",
    },
    {
      key: "shape",
      label: "Mark",
      type: "select",
      options: [
        { value: "dot", label: "Dot" },
        { value: "rings", label: "Concentric rings" },
        { value: "spiral", label: "Spiral fill" },
      ],
      default: "dot",
    },
    { key: "cell", label: "Cell size", type: "range", min: 4, max: 30, step: 1, default: 10, unit: "mm" },
    { key: "margin", label: "Margin", type: "range", min: 0, max: 40, step: 1, default: 12, unit: "mm" },
    { key: "frequency", label: "Noise scale", type: "range", min: 1, max: 24, step: 1, default: 6 },
    { key: "segments", label: "Resolution", type: "range", min: 6, max: 48, step: 1, default: 20 },
    { key: "seed", label: "Seed", type: "range", min: 1, max: 999, step: 1, default: 11 },
    { key: "invert", label: "Invert", type: "checkbox", default: false },
  ],
  generate(params: Params, ctx: GeneratorContext): Path[] {
    const source = params.source as string;
    const shape = params.shape as string;
    const cell = Math.max(2, params.cell as number);
    const margin = params.margin as number;
    const frequency = params.frequency as number;
    const segments = Math.max(4, Math.round(params.segments as number));
    const seed = Math.round(params.seed as number);
    const invert = params.invert as boolean;

    const minX = margin;
    const minY = margin;
    const maxX = ctx.pageWidth - margin;
    const maxY = ctx.pageHeight - margin;
    if (maxX - minX < cell || maxY - minY < cell) return [];

    const cols = Math.floor((maxX - minX) / cell);
    const rows = Math.floor((maxY - minY) / cell);
    const originX = minX + ((maxX - minX) - cols * cell) / 2;
    const originY = minY + ((maxY - minY) - rows * cell) / 2;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const maxDist = Math.hypot((maxX - minX) / 2, (maxY - minY) / 2);
    const freqPerMm = frequency / ctx.pageWidth;

    const valueAt = (x: number, y: number): number => {
      let v: number;
      if (source === "linear") v = (x - minX) / (maxX - minX);
      else if (source === "noise") v = valueNoise(x * freqPerMm, y * freqPerMm, seed);
      else v = 1 - Math.hypot(x - centerX, y - centerY) / maxDist; // radial
      return clamp01(invert ? 1 - v : v);
    };

    const rMax = (cell / 2) * 0.92;
    const ringGap = Math.max(0.6, cell * 0.08);
    const maxRings = Math.max(1, Math.floor(rMax / ringGap));

    const paths: Path[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const cx = originX + (i + 0.5) * cell;
        const cy = originY + (j + 0.5) * cell;
        const v = valueAt(cx, cy);
        if (v <= 0.02) continue;

        if (shape === "rings") {
          const n = Math.round(v * maxRings);
          for (let k = 1; k <= n; k++) paths.push(circle(cx, cy, k * ringGap, segments));
        } else if (shape === "spiral") {
          const turns = v * (rMax / ringGap);
          if (turns >= 0.15) paths.push(spiral(cx, cy, rMax, turns, segments));
        } else {
          const r = rMax * v;
          if (r >= 0.15) paths.push(circle(cx, cy, r, segments));
        }
      }
    }
    return paths;
  },
};
