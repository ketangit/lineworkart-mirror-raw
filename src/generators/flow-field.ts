/**
 * Flow field. Seeds a jittered grid of particles and advects each one through a
 * vector field, tracing its trail as a polyline — the classic plotter "flow"
 * look. The field is either deterministic value-noise or an analytic wave, so
 * output is dependency-free and reproducible from the seed. Demonstrates a
 * `select` control living inside a generator.
 */

import type { GeneratorDef, Params, GeneratorContext } from "../core/registry";
import type { Path, Point } from "../core/geometry";
import { valueNoise } from "../core/noise";

const TWO_PI = Math.PI * 2;

/** mulberry32 — deterministic PRNG for seed jitter. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const flowField: GeneratorDef = {
  id: "flow-field",
  name: "Flow field",
  fields: [
    {
      key: "field",
      label: "Field",
      type: "select",
      options: [
        { value: "noise", label: "Value noise" },
        { value: "waves", label: "Waves" },
      ],
      default: "noise",
    },
    { key: "density", label: "Density", type: "range", min: 4, max: 40, step: 1, default: 20 },
    { key: "steps", label: "Trail length", type: "range", min: 10, max: 250, step: 5, default: 120 },
    { key: "stepSize", label: "Step size", type: "range", min: 0.5, max: 6, step: 0.1, default: 2, unit: "mm" },
    { key: "frequency", label: "Flow scale", type: "range", min: 1, max: 24, step: 1, default: 6 },
    { key: "swirl", label: "Swirl", type: "range", min: 0.25, max: 4, step: 0.05, default: 2 },
    { key: "margin", label: "Margin", type: "range", min: 0, max: 40, step: 1, default: 15, unit: "mm" },
    { key: "seed", label: "Seed", type: "range", min: 1, max: 999, step: 1, default: 42 },
  ],
  generate(params: Params, ctx: GeneratorContext): Path[] {
    const field = params.field as string;
    const density = Math.max(2, Math.round(params.density as number));
    const steps = Math.round(params.steps as number);
    const stepSize = params.stepSize as number;
    const frequency = params.frequency as number;
    const swirl = params.swirl as number;
    const margin = params.margin as number;
    const seed = Math.round(params.seed as number);

    const W = ctx.pageWidth;
    const H = ctx.pageHeight;
    const minX = margin;
    const minY = margin;
    const maxX = W - margin;
    const maxY = H - margin;
    if (maxX <= minX || maxY <= minY) return [];

    // Spatial frequency: `frequency` field cells across the page width.
    const freqPerMm = frequency / W;
    const waveK = freqPerMm * TWO_PI;

    const angleAt = (x: number, y: number): number => {
      if (field === "waves") {
        return (Math.sin(x * waveK) + Math.cos(y * waveK * 1.3)) * Math.PI * swirl * 0.5;
      }
      return valueNoise(x * freqPerMm, y * freqPerMm, seed) * TWO_PI * swirl;
    };

    const cols = density;
    const rows = Math.max(2, Math.round(density * (maxY - minY)) / Math.max(1, maxX - minX));
    const rowCount = Math.max(2, Math.round(rows));
    const spacingX = (maxX - minX) / (cols - 1);
    const spacingY = (maxY - minY) / (rowCount - 1);
    const rand = rng(seed * 2654435761);

    const paths: Path[] = [];
    for (let j = 0; j < rowCount; j++) {
      for (let i = 0; i < cols; i++) {
        const jx = (rand() - 0.5) * spacingX * 0.8;
        const jy = (rand() - 0.5) * spacingY * 0.8;
        let x = minX + i * spacingX + jx;
        let y = minY + j * spacingY + jy;
        if (x < minX || x > maxX || y < minY || y > maxY) continue;

        const points: Point[] = [{ x, y }];
        for (let s = 0; s < steps; s++) {
          const a = angleAt(x, y);
          x += Math.cos(a) * stepSize;
          y += Math.sin(a) * stepSize;
          if (x < minX || x > maxX || y < minY || y > maxY) break;
          points.push({ x, y });
        }
        if (points.length >= 2) paths.push({ points, closed: false });
      }
    }
    return paths;
  },
};
