import { describe, it, expect } from "vitest";
import {
  makePath,
  pathLength,
  bounds,
  metrics,
  centerInPage,
} from "../src/core/geometry";

describe("pathLength", () => {
  it("measures an open polyline", () => {
    const p = makePath([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 4 },
    ]);
    expect(pathLength(p)).toBe(7);
  });

  it("adds the closing segment when closed", () => {
    const square = makePath(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      true,
    );
    expect(pathLength(square)).toBe(40);
  });
});

describe("metrics", () => {
  it("counts paths, samples and pen-ups", () => {
    const set = [
      makePath([{ x: 0, y: 0 }, { x: 1, y: 1 }]),
      makePath([{ x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }]),
    ];
    const m = metrics(set);
    expect(m.paths).toBe(2);
    expect(m.samples).toBe(5);
    expect(m.penUps).toBe(1);
  });

  it("reports zero pen-ups for a single path", () => {
    const m = metrics([makePath([{ x: 0, y: 0 }, { x: 1, y: 0 }])]);
    expect(m.penUps).toBe(0);
  });

  it("ignores empty paths", () => {
    const m = metrics([makePath([]), makePath([{ x: 0, y: 0 }, { x: 1, y: 0 }])]);
    expect(m.paths).toBe(1);
  });
});

describe("bounds + centerInPage", () => {
  it("computes a bounding box", () => {
    const b = bounds([makePath([{ x: -2, y: 1 }, { x: 4, y: 9 }])]);
    expect(b).toEqual({ minX: -2, minY: 1, maxX: 4, maxY: 9 });
  });

  it("centres geometry on the page", () => {
    const set = centerInPage([makePath([{ x: 0, y: 0 }, { x: 10, y: 10 }])], 100, 100);
    const b = bounds(set);
    // midpoint should land at page centre (50,50)
    expect((b.minX + b.maxX) / 2).toBeCloseTo(50);
    expect((b.minY + b.maxY) / 2).toBeCloseTo(50);
  });
});
