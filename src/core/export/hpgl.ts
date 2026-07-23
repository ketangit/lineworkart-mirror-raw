/**
 * HPGL export — the language old pen plotters and many vinyl cutters speak.
 * Coordinates are plotter units of 1/40 mm (40 units per mm) with the origin at
 * the bottom-left and Y pointing up, so we flip Y against the page height. Each
 * pen maps to an `SP<n>` select; a path is a `PU` move followed by one `PD`
 * with every vertex.
 */

import type { PathSet } from "../geometry";
import { optimizeOrder, type PenPaths } from "./gcode";

export interface HpglOptions {
  optimize?: boolean;
}

/** Plotter units: 40 per millimetre, rounded to integers. */
const u = (mm: number): number => Math.round(mm * 40);

export function toHPGL(
  groups: PenPaths[],
  pageHeight: number,
  opts: HpglOptions = {},
): string {
  const flipY = (y: number): number => u(pageHeight - y);
  const out: string[] = ["IN;"];

  const ordered = [...groups].sort((a, b) => a.pen - b.pen);
  for (const group of ordered) {
    const set: PathSet = opts.optimize ? optimizeOrder(group.paths).set : group.paths;
    if (set.every((p) => p.points.length === 0)) continue;

    out.push(`SP${group.pen};`);
    for (const path of set) {
      if (path.points.length === 0) continue;
      const pts = path.closed ? [...path.points, path.points[0]!] : path.points;
      const start = pts[0]!;
      out.push(`PU${u(start.x)},${flipY(start.y)};`);
      const coords = pts
        .slice(1)
        .map((p) => `${u(p.x)},${flipY(p.y)}`)
        .join(",");
      if (coords) out.push(`PD${coords};`);
    }
    out.push("PU;");
  }

  out.push("SP0;");
  return out.join("\n") + "\n";
}
