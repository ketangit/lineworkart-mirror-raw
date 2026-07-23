import { describe, it, expect } from "vitest";
import { spirograph } from "../src/generators/spirograph";
import { defaultParams } from "../src/core/registry";
import { bounds, distance } from "../src/core/geometry";

const ctx = { pageWidth: 210, pageHeight: 297 };

describe("spirograph generator", () => {
  it("produces a single closed path with default params", () => {
    const set = spirograph.generate(defaultParams(spirograph.fields), ctx);
    expect(set).toHaveLength(1);
    expect(set[0]!.closed).toBe(true);
    expect(set[0]!.points.length).toBeGreaterThan(100);
  });

  it("returns to its starting point (closure)", () => {
    const set = spirograph.generate(defaultParams(spirograph.fields), ctx);
    const pts = set[0]!.points;
    expect(distance(pts[0]!, pts[pts.length - 1]!)).toBeLessThan(1e-6);
  });

  it("normalises the design to the requested size", () => {
    const params = { ...defaultParams(spirograph.fields), size: 120 };
    const set = spirograph.generate(params, ctx);
    const b = bounds(set);
    const diameter = Math.max(b.maxX - b.minX, b.maxY - b.minY);
    // Outer extent should match the size within a small tolerance.
    expect(diameter).toBeGreaterThan(118);
    expect(diameter).toBeLessThanOrEqual(120.001);
  });

  it("yields more petals as gcd(fixed, moving) shrinks", () => {
    // coprime teeth -> many petals -> more sampled points than a low-ratio case
    const coprime = spirograph.generate(
      { ...defaultParams(spirograph.fields), fixedTeeth: 149, movingTeeth: 52 },
      ctx,
    );
    const common = spirograph.generate(
      { ...defaultParams(spirograph.fields), fixedTeeth: 100, movingTeeth: 50 },
      ctx,
    );
    expect(coprime[0]!.points.length).toBeGreaterThan(common[0]!.points.length);
  });
});
