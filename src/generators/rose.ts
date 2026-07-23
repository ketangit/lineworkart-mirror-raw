/**
 * Rose (rhodonea) curve: r = A·cos(k·θ), with k = n/d. For coprime n and d the
 * curve closes after d full turns. Even k·… gives 2n petals, odd gives n — a
 * compact demonstration that a new generator is just one self-contained file.
 */

import type { GeneratorDef, Params } from "../core/registry";
import type { Path, Point } from "../core/geometry";

export const rose: GeneratorDef = {
  id: "rose",
  name: "Rose curve",
  fields: [
    { key: "n", label: "Frequency n", type: "range", min: 1, max: 24, step: 1, default: 5 },
    { key: "d", label: "Frequency d", type: "range", min: 1, max: 24, step: 1, default: 4 },
    { key: "size", label: "Size", type: "range", min: 20, max: 280, step: 1, default: 180, unit: "mm" },
    { key: "samplesPerRev", label: "Resolution", type: "range", min: 90, max: 1080, step: 30, default: 540 },
  ],
  generate(params: Params): Path[] {
    const n = Math.max(1, Math.round(params.n as number));
    const d = Math.max(1, Math.round(params.d as number));
    const size = params.size as number;
    const samplesPerRev = Math.round(params.samplesPerRev as number);

    const k = n / d;
    const turns = d; // full turns needed to close for coprime n/d
    const totalAngle = 2 * Math.PI * turns;
    const steps = Math.max(90, samplesPerRev * turns);
    const amplitude = size / 2;

    const points: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (totalAngle * i) / steps;
      const r = amplitude * Math.cos(k * t);
      points.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
    }
    return [{ points, closed: true }];
  },
};
