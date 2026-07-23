/**
 * Path merging — the biggest single win for plot time. Adjacent generators
 * often emit many short strokes whose endpoints touch; joining them into longer
 * polylines removes the pen-up/travel/pen-down between each pair. We also drop
 * collinear interior vertices, which shrinks the file without changing the line.
 */

import type { Path, PathSet, Point } from "./geometry";
import { distance } from "./geometry";

const near = (a: Point, b: Point, tol: number): boolean => distance(a, b) <= tol;

/**
 * Remove interior points that lie (within `eps` mm) on the straight line
 * between their neighbours — the drawn shape is unchanged.
 */
export function simplifyCollinear(points: Point[], eps = 0.02): Point[] {
  if (points.length < 3) return points;
  const out: Point[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const dx = c.x - a.x;
    const dy = c.y - a.y;
    const len = Math.hypot(dx, dy);
    const perp = len < 1e-9 ? distance(a, b) : Math.abs(dx * (a.y - b.y) - dy * (a.x - b.x)) / len;
    if (perp > eps) out.push(b);
  }
  out.push(points[points.length - 1]!);
  return out;
}

export interface MergeOptions {
  /** Endpoints closer than this (mm) are treated as the same point. */
  tolerance?: number;
  /** Collinear-simplify tolerance (mm); set 0 to keep every vertex. */
  simplifyEps?: number;
}

/**
 * Greedily chain open paths whose endpoints coincide (in any orientation).
 * Closed paths pass through untouched. A chain that ends where it began is
 * promoted to a closed path.
 */
export function mergePaths(set: PathSet, opts: MergeOptions = {}): PathSet {
  const tol = opts.tolerance ?? 0.05;
  const eps = opts.simplifyEps ?? 0.02;

  const passthrough: Path[] = [];
  const chains: Point[][] = [];
  for (const p of set) {
    if (p.closed || p.points.length < 2) passthrough.push(p);
    else chains.push([...p.points]);
  }

  const result: Path[] = [];
  while (chains.length > 0) {
    let chain = chains.shift()!;
    let extended = true;
    while (extended) {
      extended = false;
      for (let i = 0; i < chains.length; i++) {
        const cand = chains[i]!;
        const head = chain[0]!;
        const tail = chain[chain.length - 1]!;
        const cs = cand[0]!;
        const ce = cand[cand.length - 1]!;
        if (near(tail, cs, tol)) chain = chain.concat(cand.slice(1));
        else if (near(tail, ce, tol)) chain = chain.concat(cand.slice(0, -1).reverse());
        else if (near(head, ce, tol)) chain = cand.slice(0, -1).concat(chain);
        else if (near(head, cs, tol)) chain = cand.slice(1).reverse().concat(chain);
        else continue;
        chains.splice(i, 1);
        extended = true;
        break;
      }
    }
    let closed = chain.length > 2 && near(chain[0]!, chain[chain.length - 1]!, tol);
    if (closed) chain = chain.slice(0, -1);
    result.push({ points: eps > 0 ? simplifyCollinear(chain, eps) : chain, closed });
  }

  const kept =
    eps > 0
      ? passthrough.map((p) =>
          p.closed && p.points.length >= 3
            ? { points: simplifyCollinear(p.points, eps), closed: true }
            : p,
        )
      : passthrough;

  return [...result, ...kept];
}
