/**
 * Dash — break a continuous path into dashes by walking it at constant
 * arc-length. One input path becomes many short paths, which is exactly what a
 * plotter draws as separate strokes, so the pen-up count in the telemetry
 * panel reflects the real cost of the effect.
 */

import type { ModifierDef, Params } from "../core/registry";
import type { Path, PathSet, Point } from "../core/geometry";

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function dashOne(path: Path, dash: number, gap: number): Path[] {
  const pts = path.closed ? [...path.points, path.points[0]!] : path.points;
  if (pts.length < 2) return [path];

  const out: Path[] = [];
  let current: Point[] = [];
  let penOn = true;
  let remaining = dash;

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen === 0) continue;
    let pos = 0;
    while (pos < segLen - 1e-9) {
      const take = Math.min(remaining, segLen - pos);
      if (penOn) {
        if (current.length === 0) current.push(lerp(a, b, pos / segLen));
        current.push(lerp(a, b, (pos + take) / segLen));
      }
      pos += take;
      remaining -= take;
      if (remaining <= 1e-9) {
        if (penOn && current.length >= 2) {
          out.push({ points: current, closed: false });
          current = [];
        }
        penOn = !penOn;
        remaining = penOn ? dash : gap;
      }
    }
  }
  if (penOn && current.length >= 2) out.push({ points: current, closed: false });
  return out;
}

export const dash: ModifierDef = {
  id: "dash",
  name: "Dash",
  fields: [
    { key: "dash", label: "Dash", type: "range", min: 0.5, max: 20, step: 0.5, default: 4, unit: "mm" },
    { key: "gap", label: "Gap", type: "range", min: 0.5, max: 20, step: 0.5, default: 2, unit: "mm" },
  ],
  apply(input: PathSet, params: Params): PathSet {
    const dashLen = Math.max(0.1, params.dash as number);
    const gapLen = Math.max(0.1, params.gap as number);
    return input.flatMap((path) => dashOne(path, dashLen, gapLen));
  },
};
