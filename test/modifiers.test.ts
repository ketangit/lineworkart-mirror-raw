import { describe, it, expect } from "vitest";
import { jitter } from "../src/modifiers/jitter";
import { dash } from "../src/modifiers/dash";
import { warp } from "../src/modifiers/warp";
import { makePath, pathLength } from "../src/core/geometry";
import { defaultParams } from "../src/core/registry";

const ctx = { pageWidth: 210, pageHeight: 297 };

function line(n: number): ReturnType<typeof makePath> {
  const pts = Array.from({ length: n }, (_, i) => ({ x: i, y: 0 }));
  return makePath(pts, false);
}

describe("jitter modifier", () => {
  it("is deterministic for a seed and moves points", () => {
    const input = [line(20)];
    const a = jitter.apply(input, { amount: 1, seed: 5 }, ctx);
    const b = jitter.apply(input, { amount: 1, seed: 5 }, ctx);
    expect(a[0]!.points).toEqual(b[0]!.points);
    expect(a[0]!.points).not.toEqual(input[0]!.points);
  });

  it("is a no-op at amount 0", () => {
    const input = [line(10)];
    expect(jitter.apply(input, { amount: 0, seed: 1 }, ctx)).toBe(input);
  });
});

describe("dash modifier", () => {
  it("splits one path into several shorter paths", () => {
    const input = [line(101)]; // 100mm long
    const out = dash.apply(input, { dash: 4, gap: 2 }, ctx);
    expect(out.length).toBeGreaterThan(1);
    // total drawn length should be less than the original
    const originalLen = pathLength(input[0]!);
    const dashedLen = out.reduce((n, p) => n + pathLength(p), 0);
    expect(dashedLen).toBeLessThan(originalLen);
  });
});

describe("warp modifier", () => {
  it("displaces along Y for a horizontal wave", () => {
    const input = [makePath([{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 30, y: 0 }], false)];
    const out = warp.apply(input, { ...defaultParams(warp.fields), amplitude: 10, wavelength: 60 }, ctx);
    // x preserved, y changed for at least one point
    expect(out[0]!.points.map((p) => p.x)).toEqual([0, 15, 30]);
    expect(out[0]!.points.some((p) => Math.abs(p.y) > 0)).toBe(true);
  });

  it("is a no-op at amplitude 0", () => {
    const input = [line(5)];
    expect(warp.apply(input, { ...defaultParams(warp.fields), amplitude: 0 }, ctx)).toBe(input);
  });
});
