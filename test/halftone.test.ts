import { describe, it, expect } from "vitest";
import { halftone } from "../src/generators/halftone";
import { defaultParams } from "../src/core/registry";
import { bounds } from "../src/core/geometry";

const ctx = { pageWidth: 210, pageHeight: 297 };

describe("halftone generator", () => {
  it("produces closed dots by default", () => {
    const set = halftone.generate(defaultParams(halftone.fields), ctx);
    expect(set.length).toBeGreaterThan(10);
    expect(set.every((p) => p.closed)).toBe(true);
  });

  it("stays within the page margins", () => {
    const params = { ...defaultParams(halftone.fields), margin: 20 };
    const set = halftone.generate(params, ctx);
    const b = bounds(set);
    expect(b.minX).toBeGreaterThanOrEqual(20 - 1e-6);
    expect(b.maxX).toBeLessThanOrEqual(210 - 20 + 1e-6);
  });

  it("invert swaps the linear gradient", () => {
    const base = { ...defaultParams(halftone.fields), source: "linear", shape: "dot" };
    const normal = halftone.generate(base, ctx);
    const inverted = halftone.generate({ ...base, invert: true }, ctx);
    // Same grid, so same count, but the dot radii should differ.
    const rad = (set: ReturnType<typeof halftone.generate>) => {
      const b = bounds([set[0]!]);
      return b.maxX - b.minX;
    };
    expect(rad(normal)).not.toBeCloseTo(rad(inverted), 3);
  });

  it("spiral marks are open paths", () => {
    const set = halftone.generate({ ...defaultParams(halftone.fields), shape: "spiral" }, ctx);
    expect(set.length).toBeGreaterThan(0);
    expect(set.every((p) => !p.closed)).toBe(true);
  });

  it("rings mode emits multiple circles per dense cell", () => {
    const dots = halftone.generate({ ...defaultParams(halftone.fields), shape: "dot" }, ctx);
    const rings = halftone.generate({ ...defaultParams(halftone.fields), shape: "rings" }, ctx);
    expect(rings.length).toBeGreaterThan(dots.length);
  });
});
