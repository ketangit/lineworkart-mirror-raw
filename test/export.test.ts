import { describe, it, expect } from "vitest";
import { pathData, toSVG } from "../src/core/export/svg";
import { toGcode, optimizeOrder, travelDistance, GCODE_PROFILES } from "../src/core/export/gcode";
import { makePath, type PathSet } from "../src/core/geometry";
import { PAGE_SIZES, type Layer } from "../src/core/document";

describe("svg export", () => {
  it("serialises a polyline to an SVG path", () => {
    const d = pathData(makePath([{ x: 0, y: 0 }, { x: 1, y: 2 }], true));
    expect(d).toBe("M 0 0 L 1 2 Z");
  });

  it("emits a millimetre viewBox and physical size", () => {
    const layer = { strokeColor: "#000", strokeWidth: 0.3, name: "L" } as Layer;
    const svg = toSVG([{ layer, paths: [makePath([{ x: 0, y: 0 }, { x: 10, y: 10 }])] }], PAGE_SIZES.a4!);
    expect(svg).toContain('width="210mm"');
    expect(svg).toContain('viewBox="0 0 210 297"');
    expect(svg).toContain('stroke="#000"');
  });
});

describe("gcode export", () => {
  const scrambled: PathSet = [
    makePath([{ x: 100, y: 100 }, { x: 110, y: 100 }]),
    makePath([{ x: 0, y: 0 }, { x: 10, y: 0 }]),
    makePath([{ x: 50, y: 50 }, { x: 60, y: 50 }]),
  ];

  it("reduces travel distance by reordering paths", () => {
    const before = travelDistance(scrambled);
    const { set, travelAfter } = optimizeOrder(scrambled);
    expect(travelAfter).toBeLessThan(before);
    expect(set).toHaveLength(scrambled.length);
  });

  it("emits a valid-looking program with pen up/down", () => {
    const g = toGcode(scrambled, GCODE_PROFILES.servo!, { optimize: true });
    expect(g).toContain("G21"); // mm units
    expect(g).toContain("G90"); // absolute
    expect(g).toMatch(/M3 S1000/); // pen down
    expect(g).toMatch(/M5/); // pen up
    expect(g.trim().split("\n").length).toBeGreaterThan(6);
  });
});
