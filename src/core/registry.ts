/**
 * Module registry. Generators produce line-work from parameters; modifiers
 * transform existing line-work. Both declare a `fields` schema, and the editor
 * builds their control panel automatically from that schema — so adding a new
 * module is a single self-contained file, with no UI wiring to touch.
 */

import type { PathSet } from "./geometry";

export type FieldType = "range" | "select" | "checkbox" | "color" | "text";

export interface FieldBase {
  key: string;
  label: string;
  type: FieldType;
}

export interface RangeField extends FieldBase {
  type: "range";
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface SelectField extends FieldBase {
  type: "select";
  options: { value: string; label: string }[];
  default: string;
}

export interface CheckboxField extends FieldBase {
  type: "checkbox";
  default: boolean;
}

export interface ColorField extends FieldBase {
  type: "color";
  default: string;
}

export interface TextField extends FieldBase {
  type: "text";
  default: string;
}

export type Field =
  | RangeField
  | SelectField
  | CheckboxField
  | ColorField
  | TextField;

export type ParamValue = number | string | boolean;
export type Params = Record<string, ParamValue>;

export interface GeneratorContext {
  /** Page width in millimetres. */
  pageWidth: number;
  /** Page height in millimetres. */
  pageHeight: number;
}

export interface GeneratorDef {
  id: string;
  name: string;
  fields: Field[];
  generate(params: Params, ctx: GeneratorContext): PathSet;
}

export interface ModifierDef {
  id: string;
  name: string;
  fields: Field[];
  apply(input: PathSet, params: Params, ctx: GeneratorContext): PathSet;
}

const generators = new Map<string, GeneratorDef>();
const modifiers = new Map<string, ModifierDef>();

export function registerGenerator(def: GeneratorDef): void {
  if (generators.has(def.id)) {
    throw new Error(`Generator "${def.id}" already registered`);
  }
  generators.set(def.id, def);
}

export function registerModifier(def: ModifierDef): void {
  if (modifiers.has(def.id)) {
    throw new Error(`Modifier "${def.id}" already registered`);
  }
  modifiers.set(def.id, def);
}

export function getGenerator(id: string): GeneratorDef | undefined {
  return generators.get(id);
}

export function getModifier(id: string): ModifierDef | undefined {
  return modifiers.get(id);
}

export function listGenerators(): GeneratorDef[] {
  return [...generators.values()];
}

export function listModifiers(): ModifierDef[] {
  return [...modifiers.values()];
}

/** Build a default params object from a field schema. */
export function defaultParams(fields: Field[]): Params {
  const out: Params = {};
  for (const f of fields) out[f.key] = f.default;
  return out;
}
