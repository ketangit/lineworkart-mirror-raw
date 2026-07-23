import { describe, it, expect } from "vitest";
import { textPath } from "../src/generators/text-path";
import { glyphFor, CAP_HEIGHT } from "../src/core/font";
import { defaultParams } from "../src/core/registry";
import { bounds } from "../src/core/geometry";

const ctx = { pageWidth: 210, pageHeight: 297 };

describe("font", () => {
  it("maps lowercase to uppercase and unknowns to space", () => {
    expect(glyphFor("a")).toBe(glyphFor("A"));
    expect(glyphFor("~")).toBe(glyphFor(" "));
  });

  it("keeps glyphs within the em box", () => {
    for (const ch of "ABYZ0159") {
      const g = glyphFor(ch);
      for (const stroke of g.strokes) {
        for (const [x, y] of stroke) {
          expect(x!).toBeGreaterThanOrEqual(-0.5);
          expect(x!).toBeLessThanOrEqual(g.width + 0.5);
          expect(y!).toBeLessThanOrEqual(CAP_HEIGHT + 0.5);
        }
      }
    }
  });
});

describe("text-path generator", () => {
  it("produces open stroke paths for straight text", () => {
    const set = textPath.generate({ ...defaultParams(textPath.fields), text: "AB", path: "straight" }, ctx);
    expect(set.length).toBeGreaterThan(0);
    expect(set.every((p) => !p.closed)).toBe(true);
  });

  it("returns nothing for empty text", () => {
    const set = textPath.generate({ ...defaultParams(textPath.fields), text: "" }, ctx);
    expect(set).toHaveLength(0);
  });

  it("scales roughly with the requested cap height", () => {
    const small = textPath.generate({ ...defaultParams(textPath.fields), text: "HI", path: "straight", size: 10 }, ctx);
    const big = textPath.generate({ ...defaultParams(textPath.fields), text: "HI", path: "straight", size: 30 }, ctx);
    const h = (s: ReturnType<typeof textPath.generate>) => {
      const b = bounds(s);
      return b.maxY - b.minY;
    };
    expect(h(big)).toBeGreaterThan(h(small) * 2);
  });

  it("curves the baseline: an arc is taller than straight for the same text", () => {
    const base = { ...defaultParams(textPath.fields), text: "LINE & FORM", size: 16 };
    const straight = textPath.generate({ ...base, path: "straight" }, ctx);
    const arc = textPath.generate({ ...base, path: "arc", radius: 40 }, ctx);
    const bStraight = bounds(straight);
    const bArc = bounds(arc);
    expect(bArc.maxY - bArc.minY).toBeGreaterThan(bStraight.maxY - bStraight.minY);
  });
});
