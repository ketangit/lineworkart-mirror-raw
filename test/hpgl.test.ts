import { describe, it, expect } from "vitest";
import { toHPGL } from "../src/core/export/hpgl";
import { makePath } from "../src/core/geometry";

describe("HPGL export", () => {
  it("wraps the program with IN; and SP0;", () => {
    const hpgl = toHPGL([{ pen: 1, paths: [makePath([{ x: 0, y: 0 }, { x: 10, y: 0 }])] }], 100);
    expect(hpgl.startsWith("IN;")).toBe(true);
    expect(hpgl).toContain("SP1;");
    expect(hpgl.trim().endsWith("SP0;")).toBe(true);
  });

  it("scales to plotter units (40/mm) and flips Y against the page", () => {
    const hpgl = toHPGL([{ pen: 1, paths: [makePath([{ x: 0, y: 0 }, { x: 10, y: 50 }])] }], 100);
    // (0,0) -> x 0, y (100-0)*40 = 4000
    expect(hpgl).toContain("PU0,4000;");
    // (10,50) -> x 400, y (100-50)*40 = 2000
    expect(hpgl).toContain("PD400,2000;");
  });

  it("selects a new pen for each group", () => {
    const hpgl = toHPGL(
      [
        { pen: 1, paths: [makePath([{ x: 0, y: 0 }, { x: 10, y: 0 }])] },
        { pen: 2, paths: [makePath([{ x: 0, y: 10 }, { x: 10, y: 10 }])] },
      ],
      100,
    );
    expect(hpgl).toContain("SP1;");
    expect(hpgl).toContain("SP2;");
  });

  it("closes a closed path back to its first point", () => {
    const hpgl = toHPGL(
      [{ pen: 1, paths: [makePath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], true)] }],
      100,
    );
    // the PD should include the return to the start coordinate (x0 -> 0, y0 -> 4000)
    const pd = hpgl.split("\n").find((l) => l.startsWith("PD"))!;
    expect(pd.endsWith("0,4000;")).toBe(true);
  });
});
