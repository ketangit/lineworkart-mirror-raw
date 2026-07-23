/**
 * Auto-generated controls. Given a field schema and a params object, build the
 * DOM inputs and wire them back to the params. This is the whole reason a new
 * module needs no UI code: declare `fields`, get a panel.
 */

import type { Field, Params, ParamValue } from "../core/registry";

export type ChangeHandler = (key: string, value: ParamValue) => void;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function buildRange(field: Field & { type: "range" }, params: Params, onChange: ChangeHandler): HTMLElement {
  const wrap = el("label", "field");
  const label = el("span", "field__label");
  label.textContent = field.label;
  const row = el("div", "field__row");

  const input = el("input");
  input.type = "range";
  input.min = String(field.min);
  input.max = String(field.max);
  input.step = String(field.step);
  input.value = String(params[field.key]);

  const value = el("span", "field__value");
  const fmt = () => {
    const v = Number(params[field.key]);
    value.textContent = field.step < 1 ? v.toFixed(2) : String(v);
  };
  fmt();

  input.addEventListener("input", () => {
    const v = Number(input.value);
    params[field.key] = v;
    fmt();
    onChange(field.key, v);
  });

  row.append(input, value);
  if (field.unit) {
    const unit = el("span", "field__unit");
    unit.textContent = field.unit;
    row.append(unit);
  }
  wrap.append(label, row);
  return wrap;
}

function buildSelect(field: Field & { type: "select" }, params: Params, onChange: ChangeHandler): HTMLElement {
  const wrap = el("label", "field");
  const label = el("span", "field__label");
  label.textContent = field.label;
  const select = el("select");
  for (const opt of field.options) {
    const o = el("option");
    o.value = opt.value;
    o.textContent = opt.label;
    select.append(o);
  }
  select.value = String(params[field.key]);
  select.addEventListener("change", () => {
    params[field.key] = select.value;
    onChange(field.key, select.value);
  });
  wrap.append(label, select);
  return wrap;
}

function buildCheckbox(field: Field & { type: "checkbox" }, params: Params, onChange: ChangeHandler): HTMLElement {
  const wrap = el("label", "field field--checkbox");
  const row = el("div", "field__row");
  const input = el("input");
  input.type = "checkbox";
  input.checked = Boolean(params[field.key]);
  const label = el("span", "field__label");
  label.textContent = field.label;
  input.addEventListener("change", () => {
    params[field.key] = input.checked;
    onChange(field.key, input.checked);
  });
  row.append(input, label);
  wrap.append(row);
  return wrap;
}

function buildColor(field: Field & { type: "color" }, params: Params, onChange: ChangeHandler): HTMLElement {
  const wrap = el("label", "field");
  const label = el("span", "field__label");
  label.textContent = field.label;
  const row = el("div", "field__row");
  const input = el("input");
  input.type = "color";
  input.value = String(params[field.key]);
  input.addEventListener("input", () => {
    params[field.key] = input.value;
    onChange(field.key, input.value);
  });
  row.append(input);
  wrap.append(label, row);
  return wrap;
}

function buildText(field: Field & { type: "text" }, params: Params, onChange: ChangeHandler): HTMLElement {
  const wrap = el("label", "field");
  const label = el("span", "field__label");
  label.textContent = field.label;
  const input = el("input");
  input.type = "text";
  input.value = String(params[field.key]);
  input.addEventListener("input", () => {
    params[field.key] = input.value;
    onChange(field.key, input.value);
  });
  wrap.append(label, input);
  return wrap;
}

export function buildField(field: Field, params: Params, onChange: ChangeHandler): HTMLElement {
  switch (field.type) {
    case "range":
      return buildRange(field, params, onChange);
    case "select":
      return buildSelect(field, params, onChange);
    case "checkbox":
      return buildCheckbox(field, params, onChange);
    case "color":
      return buildColor(field, params, onChange);
    case "text":
      return buildText(field, params, onChange);
  }
}

export function buildFields(fields: Field[], params: Params, onChange: ChangeHandler): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const field of fields) frag.append(buildField(field, params, onChange));
  return frag;
}
