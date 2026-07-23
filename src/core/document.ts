/**
 * Document model. A document is a page (in millimetres) holding an ordered
 * stack of layers. Each layer references one generator plus a chain of
 * modifiers, its own parameters, and stroke styling. Layers are re-evaluated
 * lazily and cached until their inputs change.
 */

import type { PathSet } from "./geometry";
import { centerInPage } from "./geometry";
import type { Params } from "./registry";
import {
  defaultParams,
  getGenerator,
  getModifier,
} from "./registry";

export interface ModifierInstance {
  modifierId: string;
  params: Params;
  enabled: boolean;
}

export interface Layer {
  id: string;
  name: string;
  generatorId: string;
  params: Params;
  modifiers: ModifierInstance[];
  strokeColor: string;
  strokeWidth: number; // mm
  visible: boolean;
  locked: boolean;
  /** Centre the generated line-work on the page. */
  center: boolean;
}

export interface PageSize {
  width: number; // mm
  height: number; // mm
  label: string;
}

export const PAGE_SIZES: Record<string, PageSize> = {
  a4: { width: 210, height: 297, label: "A4" },
  a5: { width: 148, height: 210, label: "A5" },
  a3: { width: 297, height: 420, label: "A3" },
  letter: { width: 215.9, height: 279.4, label: "US Letter" },
  square: { width: 200, height: 200, label: "Square 200" },
};

export interface Document {
  page: PageSize;
  layers: Layer[];
}

let idCounter = 0;
const nextId = (prefix: string): string => `${prefix}-${++idCounter}`;

export function createLayer(generatorId: string, name?: string): Layer {
  const gen = getGenerator(generatorId);
  if (!gen) throw new Error(`Unknown generator "${generatorId}"`);
  return {
    id: nextId("layer"),
    name: name ?? gen.name,
    generatorId,
    params: defaultParams(gen.fields),
    modifiers: [],
    strokeColor: "#e85b4f",
    strokeWidth: 0.2,
    visible: true,
    locked: false,
    center: true,
  };
}

export function createDocument(generatorId: string, page = PAGE_SIZES.a4!): Document {
  return { page, layers: [createLayer(generatorId)] };
}

/** Deep-clone a layer (new id, independent params + modifier chain). */
export function duplicateLayer(layer: Layer): Layer {
  return {
    ...layer,
    id: nextId("layer"),
    name: `${layer.name} copy`,
    params: { ...layer.params },
    modifiers: layer.modifiers.map((m) => ({ ...m, params: { ...m.params } })),
  };
}

export function addModifier(layer: Layer, modifierId: string): void {
  const mod = getModifier(modifierId);
  if (!mod) throw new Error(`Unknown modifier "${modifierId}"`);
  layer.modifiers.push({
    modifierId,
    params: defaultParams(mod.fields),
    enabled: true,
  });
}

/** Evaluate a single layer to line-work. */
export function evaluateLayer(layer: Layer, page: PageSize): PathSet {
  const gen = getGenerator(layer.generatorId);
  if (!gen) return [];
  const ctx = { pageWidth: page.width, pageHeight: page.height };
  let set = gen.generate(layer.params, ctx);
  if (layer.center) set = centerInPage(set, page.width, page.height);
  for (const inst of layer.modifiers) {
    if (!inst.enabled) continue;
    const mod = getModifier(inst.modifierId);
    if (mod) set = mod.apply(set, inst.params, ctx);
  }
  return set;
}

export interface EvaluatedLayer {
  layer: Layer;
  paths: PathSet;
}

/** Evaluate every visible layer in draw order. */
export function evaluateDocument(doc: Document): EvaluatedLayer[] {
  return doc.layers
    .filter((l) => l.visible)
    .map((layer) => ({ layer, paths: evaluateLayer(layer, doc.page) }));
}
