import { describe, it, expect } from "vitest";
import { pathData, toSVG } from "../src/core/export/svg";
import { toGcode, toGcodePens, optimizeOrder, travelDistance, GCODE_PROFILES } from "../src/core/export/gcode";
import { makePath, type PathSet } from "../src/core/geometry";
import { PAGE_SIZES, type Layer } from "../src/core/document";

const fakeLayer = (pen: number, color: string): Layer =>
  ({ strokeColor: color, strokeWidth: 0.3, name: `L${pen}`, pen }) as Layer;

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

  it("wraps each pen in its own Inkscape layer group", () => {
    const svg = toSVG(
      [
        { layer: fakeLayer(1, "#111111"), paths: [makePath([{ x: 0, y: 0 }, { x: 5, y: 5 }])] },
        { layer: fakeLayer(2, "#222222"), paths: [makePath([{ x: 0, y: 0 }, { x: 5, y: 0 }])] },
      ],
      PAGE_SIZES.a4!,
    );
    expect(svg).toContain('data-pen="1"');
    expect(svg).toContain('data-pen="2"');
    expect(svg).toContain('inkscape:label="Pen 1"');
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

  it("emits a pen-change pause between pen groups", () => {
    const groups = [
      { pen: 1, paths: [makePath([{ x: 0, y: 0 }, { x: 10, y: 0 }])] },
      { pen: 2, paths: [makePath([{ x: 0, y: 10 }, { x: 10, y: 10 }])] },
    ];
    const g = toGcodePens(groups, GCODE_PROFILES.servo!, { penPause: true });
    expect(g).toContain("; ---- pen 1 ----");
    expect(g).toContain("; ---- pen 2 ----");
    expect(g).toContain("; change to pen 2");
    expect(g).toMatch(/^M0$/m);
  });

  it("omits the pause when penPause is false", () => {
    const groups = [
      { pen: 1, paths: [makePath([{ x: 0, y: 0 }, { x: 10, y: 0 }])] },
      { pen: 2, paths: [makePath([{ x: 0, y: 10 }, { x: 10, y: 10 }])] },
    ];
    const g = toGcodePens(groups, GCODE_PROFILES.servo!, { penPause: false });
    expect(g).not.toContain("change to pen");
  });
});
