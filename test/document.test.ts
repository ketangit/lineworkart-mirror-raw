import { describe, it, expect, beforeAll } from "vitest";
import {
  createDocument,
  createLayer,
  duplicateLayer,
  evaluateDocument,
  PAGE_SIZES,
} from "../src/core/document";
import { registerGenerators } from "../src/generators";

beforeAll(() => registerGenerators());

describe("document + layers", () => {
  it("starts with a single layer", () => {
    const doc = createDocument("spirograph", PAGE_SIZES.a4!);
    expect(doc.layers).toHaveLength(1);
    expect(doc.layers[0]!.generatorId).toBe("spirograph");
  });

  it("duplicates a layer independently (new id, decoupled params)", () => {
    const layer = createLayer("spirograph");
    const clone = duplicateLayer(layer);
    expect(clone.id).not.toBe(layer.id);
    expect(clone.name).toContain("copy");
    clone.params.size = 42;
    expect(layer.params.size).not.toBe(42);
  });

  it("evaluates only visible layers", () => {
    const doc = createDocument("spirograph", PAGE_SIZES.a4!);
    doc.layers.push(createLayer("rose"));
    doc.layers[0]!.visible = false;
    const evaluated = evaluateDocument(doc);
    expect(evaluated).toHaveLength(1);
    expect(evaluated[0]!.layer.generatorId).toBe("rose");
  });

  it("preserves draw order in the evaluated output", () => {
    const doc = createDocument("spirograph", PAGE_SIZES.a4!);
    doc.layers.push(createLayer("rose"));
    const evaluated = evaluateDocument(doc);
    expect(evaluated.map((e) => e.layer.generatorId)).toEqual(["spirograph", "rose"]);
  });
});
