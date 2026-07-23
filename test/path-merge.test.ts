import { describe, it, expect } from "vitest";
import { mergePaths, simplifyCollinear } from "../src/core/path-merge";
import { makePath, bounds } from "../src/core/geometry";

describe("simplifyCollinear", () => {
  it("drops a point on the straight line between its neighbours", () => {
    const out = simplifyCollinear([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }]);
    expect(out).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  });

  it("keeps a genuine corner", () => {
    const out = simplifyCollinear([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
    expect(out).toHaveLength(3);
  });
});

describe("mergePaths", () => {
  it("joins two paths that share an endpoint into one", () => {
    const set = [
      makePath([{ x: 0, y: 0 }, { x: 10, y: 0 }]),
      makePath([{ x: 10, y: 0 }, { x: 10, y: 10 }]),
    ];
    const merged = mergePaths(set);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.points).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
  });

  it("joins across a reversed candidate", () => {
    const set = [
      makePath([{ x: 0, y: 0 }, { x: 10, y: 0 }]),
      makePath([{ x: 20, y: 0 }, { x: 10, y: 0 }]), // end touches the first path's end
    ];
    const merged = mergePaths(set);
    expect(merged).toHaveLength(1);
    const b = bounds(merged);
    expect(b.minX).toBe(0);
    expect(b.maxX).toBe(20);
  });

  it("promotes a closed loop when the chain returns to start", () => {
    const set = [
      makePath([{ x: 0, y: 0 }, { x: 10, y: 0 }]),
      makePath([{ x: 10, y: 0 }, { x: 5, y: 8 }]),
      makePath([{ x: 5, y: 8 }, { x: 0, y: 0 }]),
    ];
    const merged = mergePaths(set);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.closed).toBe(true);
  });

  it("passes closed paths through and merges only the open ones", () => {
    const square = makePath(
      [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
      true,
    );
    const set = [
      square,
      makePath([{ x: 20, y: 0 }, { x: 30, y: 0 }]),
      makePath([{ x: 30, y: 0 }, { x: 30, y: 10 }]),
    ];
    const merged = mergePaths(set);
    // one merged open chain + the untouched square
    expect(merged).toHaveLength(2);
    expect(merged.some((p) => p.closed)).toBe(true);
  });

  it("does not merge paths whose endpoints are far apart", () => {
    const set = [
      makePath([{ x: 0, y: 0 }, { x: 10, y: 0 }]),
      makePath([{ x: 50, y: 50 }, { x: 60, y: 50 }]),
    ];
    expect(mergePaths(set)).toHaveLength(2);
  });
});
