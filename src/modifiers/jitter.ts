/**
 * Jitter — a deterministic hand-drawn wobble. Each point is nudged by a seeded
 * random offset so a mechanical curve reads as if drawn by hand. Seeded so the
 * same parameters always plot the same line.
 */

import type { ModifierDef, Params } from "../core/registry";
import type { PathSet } from "../core/geometry";

/** mulberry32 — tiny deterministic PRNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const jitter: ModifierDef = {
  id: "jitter",
  name: "Jitter",
  fields: [
    { key: "amount", label: "Amount", type: "range", min: 0, max: 5, step: 0.05, default: 0.6, unit: "mm" },
    { key: "seed", label: "Seed", type: "range", min: 1, max: 999, step: 1, default: 7 },
  ],
  apply(input: PathSet, params: Params): PathSet {
    const amount = params.amount as number;
    if (amount <= 0) return input;
    const rand = rng(Math.round(params.seed as number));
    return input.map((path) => ({
      closed: path.closed,
      points: path.points.map((p) => ({
        x: p.x + (rand() - 0.5) * 2 * amount,
        y: p.y + (rand() - 0.5) * 2 * amount,
      })),
    }));
  },
};
