/**
 * Spirograph. A pen fixed to a gear of `movingTeeth` rolling against a gear of
 * `fixedTeeth` — inside the ring (hypotrochoid) or around it (epitrochoid).
 * Using integer teeth makes closure exact: the curve returns to its start after
 * `movingTeeth / gcd(fixed, moving)` trips around, giving `fixed / gcd` petals.
 */

import type { GeneratorDef, Params } from "../core/registry";
import type { Path, Point } from "../core/geometry";

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export const spirograph: GeneratorDef = {
  id: "spirograph",
  name: "Spirograph",
  fields: [
    { key: "fixedTeeth", label: "Fixed teeth", type: "range", min: 24, max: 300, step: 1, default: 144 },
    { key: "movingTeeth", label: "Moving teeth", type: "range", min: 7, max: 200, step: 1, default: 52 },
    { key: "penOffset", label: "Pen offset", type: "range", min: 0, max: 1, step: 0.01, default: 0.8 },
    { key: "size", label: "Size", type: "range", min: 20, max: 280, step: 1, default: 170, unit: "mm" },
    { key: "samplesPerRev", label: "Resolution", type: "range", min: 60, max: 720, step: 10, default: 360 },
    { key: "inside", label: "Roll inside (hypotrochoid)", type: "checkbox", default: true },
  ],
  generate(params: Params): Path[] {
    const fixed = Math.max(3, Math.round(params.fixedTeeth as number));
    const moving = Math.max(2, Math.round(params.movingTeeth as number));
    const penOffset = params.penOffset as number;
    const size = params.size as number;
    const samplesPerRev = Math.round(params.samplesPerRev as number);
    const inside = params.inside as boolean;

    const g = gcd(fixed, moving);
    const revolutions = moving / g;
    const totalAngle = 2 * Math.PI * revolutions;
    const steps = Math.max(64, Math.round(samplesPerRev * revolutions));

    const R = fixed;
    const r = moving;
    const d = penOffset * r;

    const raw: Point[] = [];
    let maxR = 0;
    for (let i = 0; i <= steps; i++) {
      const t = (totalAngle * i) / steps;
      let x: number;
      let y: number;
      if (inside) {
        const diff = R - r;
        x = diff * Math.cos(t) + d * Math.cos((diff / r) * t);
        y = diff * Math.sin(t) - d * Math.sin((diff / r) * t);
      } else {
        const sum = R + r;
        x = sum * Math.cos(t) - d * Math.cos((sum / r) * t);
        y = sum * Math.sin(t) - d * Math.sin((sum / r) * t);
      }
      raw.push({ x, y });
      const rr = Math.hypot(x, y);
      if (rr > maxR) maxR = rr;
    }

    // Normalise so the design's diameter equals `size` millimetres.
    const s = maxR > 0 ? size / 2 / maxR : 1;
    const points = raw.map((p) => ({ x: p.x * s, y: p.y * s }));
    return [{ points, closed: true }];
  },
};
