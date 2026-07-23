import { describe, it, expect } from "vitest";
import { flowField } from "../src/generators/flow-field";
import { defaultParams } from "../src/core/registry";
import { bounds } from "../src/core/geometry";

const ctx = { pageWidth: 210, pageHeight: 297 };

describe("flow-field generator", () => {
  it("produces many open trails", () => {
    const set = flowField.generate(defaultParams(flowField.fields), ctx);
    expect(set.length).toBeGreaterThan(50);
    expect(set.every((p) => !p.closed)).toBe(true);
    expect(set.every((p) => p.points.length >= 2)).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    const a = flowField.generate(defaultParams(flowField.fields), ctx);
    const b = flowField.generate(defaultParams(flowField.fields), ctx);
    expect(a.length).toBe(b.length);
    expect(a[0]!.points).toEqual(b[0]!.points);
  });

  it("keeps every point inside the page margins", () => {
    const params = { ...defaultParams(flowField.fields), margin: 20 };
    const set = flowField.generate(params, ctx);
    const b = bounds(set);
    expect(b.minX).toBeGreaterThanOrEqual(20 - 1e-6);
    expect(b.minY).toBeGreaterThanOrEqual(20 - 1e-6);
    expect(b.maxX).toBeLessThanOrEqual(210 - 20 + 1e-6);
    expect(b.maxY).toBeLessThanOrEqual(297 - 20 + 1e-6);
  });

  it("changes with the field type", () => {
    const noise = flowField.generate({ ...defaultParams(flowField.fields), field: "noise" }, ctx);
    const waves = flowField.generate({ ...defaultParams(flowField.fields), field: "waves" }, ctx);
    // Different fields should not trace identical first trails.
    expect(noise[0]!.points).not.toEqual(waves[0]!.points);
  });
});
