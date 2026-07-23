import { describe, it, expect } from "vitest";
import { truchet } from "../src/generators/truchet";
import { defaultParams } from "../src/core/registry";
import { bounds } from "../src/core/geometry";

const ctx = { pageWidth: 210, pageHeight: 297 };

describe("truchet generator", () => {
  it("emits two open arcs per tile by default", () => {
    const set = truchet.generate(defaultParams(truchet.fields), ctx);
    expect(set.length).toBeGreaterThan(0);
    expect(set.every((p) => !p.closed)).toBe(true);
    expect(set.length % 2).toBe(0); // two arcs per tile
  });

  it("emits one segment per tile in diagonal style", () => {
    const arcs = truchet.generate({ ...defaultParams(truchet.fields), style: "arcs" }, ctx);
    const diag = truchet.generate({ ...defaultParams(truchet.fields), style: "diagonal" }, ctx);
    expect(diag.length).toBe(arcs.length / 2);
    expect(diag.every((p) => p.points.length === 2)).toBe(true);
  });

  it("is deterministic and stays within the page", () => {
    const a = truchet.generate(defaultParams(truchet.fields), ctx);
    const b = truchet.generate(defaultParams(truchet.fields), ctx);
    expect(a[0]!.points).toEqual(b[0]!.points);
    const bb = bounds(a);
    expect(bb.minX).toBeGreaterThanOrEqual(-1e-6);
    expect(bb.maxX).toBeLessThanOrEqual(210 + 1e-6);
    expect(bb.maxY).toBeLessThanOrEqual(297 + 1e-6);
  });
});
