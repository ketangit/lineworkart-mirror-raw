/**
 * G-code export for pen plotters / CNC. Two things beyond a naive dump:
 *  - Device profiles describe how a given machine lifts and drops the pen
 *    (servo M-codes or a Z hop) plus feed rates and units.
 *  - `optimizeOrder` greedily reorders and flips paths (nearest-neighbour) to
 *    cut travel distance and, with it, the number of pen-up moves.
 */

import type { Path, PathSet, Point } from "../geometry";
import { distance } from "../geometry";

export interface GcodeProfile {
  id: string;
  name: string;
  penMode: "servo" | "z";
  /** Servo commands (penMode "servo"). */
  penDownCmd?: string;
  penUpCmd?: string;
  /** Z heights in mm (penMode "z"). */
  penDownZ?: number;
  penUpZ?: number;
  drawFeed: number; // mm/min
  travelFeed: number; // mm/min
  /** Extra lines emitted at start / end of the program. */
  preamble: string[];
  postamble: string[];
}

export const GCODE_PROFILES: Record<string, GcodeProfile> = {
  servo: {
    id: "servo",
    name: "Pen plotter (servo)",
    penMode: "servo",
    penDownCmd: "M3 S1000",
    penUpCmd: "M5",
    drawFeed: 1500,
    travelFeed: 3000,
    preamble: ["G21", "G90", "G17", "M5"],
    postamble: ["M5", "G0 X0 Y0"],
  },
  zhop: {
    id: "zhop",
    name: "CNC pen (Z hop)",
    penMode: "z",
    penDownZ: -1,
    penUpZ: 5,
    drawFeed: 1200,
    travelFeed: 2400,
    preamble: ["G21", "G90", "G0 Z5"],
    postamble: ["G0 Z5", "G0 X0 Y0"],
  },
};

function reverse(path: Path): Path {
  return { closed: path.closed, points: [...path.points].reverse() };
}

const first = (p: Path): Point => p.points[0]!;
const last = (p: Path): Point => p.points[p.points.length - 1]!;

export interface OptimizeResult {
  set: PathSet;
  travelBefore: number;
  travelAfter: number;
}

/**
 * Greedy nearest-neighbour ordering starting from the origin. Each step picks
 * the remaining path whose nearer endpoint is closest, flipping it so drawing
 * begins at that endpoint.
 */
export function optimizeOrder(input: PathSet): OptimizeResult {
  const drawable = input.filter((p) => p.points.length > 0);
  const travelBefore = travelDistance(drawable);
  const remaining = [...drawable];
  const ordered: PathSet = [];
  let cursor: Point = { x: 0, y: 0 };

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDist = Infinity;
    let bestFlip = false;
    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i]!;
      const dStart = distance(cursor, first(p));
      const dEnd = distance(cursor, last(p));
      if (dStart < bestDist) {
        bestDist = dStart;
        bestIndex = i;
        bestFlip = false;
      }
      if (dEnd < bestDist) {
        bestDist = dEnd;
        bestIndex = i;
        bestFlip = true;
      }
    }
    let chosen = remaining.splice(bestIndex, 1)[0]!;
    if (bestFlip) chosen = reverse(chosen);
    ordered.push(chosen);
    cursor = last(chosen);
  }

  return {
    set: ordered,
    travelBefore,
    travelAfter: travelDistance(ordered),
  };
}

/** Sum of pen-up travel moves between consecutive paths (from the origin). */
export function travelDistance(set: PathSet): number {
  let cursor: Point = { x: 0, y: 0 };
  let total = 0;
  for (const p of set) {
    if (p.points.length === 0) continue;
    total += distance(cursor, first(p));
    cursor = last(p);
  }
  return total;
}

export interface GcodeOptions {
  optimize?: boolean;
}

function num(v: number): string {
  return (Math.round(v * 1000) / 1000).toString();
}

export function toGcode(
  input: PathSet,
  profile: GcodeProfile,
  opts: GcodeOptions = {},
): string {
  const set = opts.optimize ? optimizeOrder(input).set : input;
  const lines: string[] = [];
  const penUp = () =>
    lines.push(profile.penMode === "servo" ? profile.penUpCmd! : `G0 Z${num(profile.penUpZ!)}`);
  const penDown = () =>
    lines.push(
      profile.penMode === "servo" ? profile.penDownCmd! : `G1 Z${num(profile.penDownZ!)} F${profile.drawFeed}`,
    );

  lines.push(`; Line & Form — ${profile.name}`);
  lines.push(...profile.preamble);

  for (const path of set) {
    if (path.points.length === 0) continue;
    const pts = path.closed
      ? [...path.points, path.points[0]!]
      : path.points;
    const start = pts[0]!;
    penUp();
    lines.push(`G0 X${num(start.x)} Y${num(start.y)} F${profile.travelFeed}`);
    penDown();
    for (let i = 1; i < pts.length; i++) {
      lines.push(`G1 X${num(pts[i]!.x)} Y${num(pts[i]!.y)} F${profile.drawFeed}`);
    }
  }

  penUp();
  lines.push(...profile.postamble);
  return lines.join("\n") + "\n";
}
