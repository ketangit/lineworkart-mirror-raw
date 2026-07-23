/**
 * Editor entry. Registers modules, builds the three-column shell, and keeps a
 * single `recompute()` path: any control change re-evaluates the document and
 * repaints the canvas + telemetry. Deliberately framework-free — the DOM is the
 * state's only view, mirroring the no-build ethos of the original while running
 * on a real bundler underneath.
 */

import { registerGenerators } from "./generators";
import { registerModifiers } from "./modifiers";
import {
  listGenerators,
  getGenerator,
  listModifiers,
  getModifier,
  defaultParams,
} from "./core/registry";
import {
  createDocument,
  createLayer,
  duplicateLayer,
  evaluateDocument,
  PAGE_SIZES,
  type Document,
  type Layer,
} from "./core/document";
import { metrics } from "./core/geometry";
import { renderInto, fitScale } from "./core/renderer";
import { toSVG } from "./core/export/svg";
import { toGcode, optimizeOrder, GCODE_PROFILES } from "./core/export/gcode";
import { buildFields } from "./ui/controls";

registerGenerators();
registerModifiers();

/** Rotating palette so stacked layers stay visually distinct. */
const LAYER_PALETTE = ["#e85b4f", "#2fa765", "#f47a2a", "#1f6a54", "#2b6cb0", "#b0479e"];

const doc: Document = createDocument("spirograph", PAGE_SIZES.a4!);
let active: Layer = doc.layers[0]!;

const app = document.getElementById("app")!;

// ---- Static shell ------------------------------------------------------

app.innerHTML = `
  <aside class="panel controls">
    <div class="brand">
      <span class="brand__eyebrow">Line &amp; Form</span>
      <span class="brand__word">Studio</span>
    </div>
    <div class="verbs">
      <button class="btn btn--primary" id="make">＋ Make</button>
      <button class="btn" id="randomize">Randomize</button>
    </div>
    <div class="panel__body" id="controls-body"></div>
  </aside>

  <section class="stage">
    <div class="paper" id="paper"></div>
    <div class="tool-rail" role="toolbar" aria-label="Tools">
      <button class="tool" aria-pressed="true" title="Select">⌖</button>
      <button class="tool" title="Rectangle">▭</button>
      <button class="tool" title="Ellipse">◯</button>
      <button class="tool" title="Line">╱</button>
      <button class="tool" title="Polygon">⬠</button>
      <button class="tool" title="Text">T</button>
    </div>
  </section>

  <aside class="panel telemetry">
    <div class="panel__head"><h2 class="panel__title">Drawing Order</h2></div>
    <div class="panel__body">
      <div class="gauge"><div class="gauge__ring" id="gauge"><span class="gauge__value">100%</span></div></div>
      <div class="stat"><span class="stat__key">Size</span><span class="stat__val" id="s-size">—</span></div>
      <div class="stat"><span class="stat__key">Layers</span><span class="stat__val" id="s-layers">—</span></div>
      <div class="stat"><span class="stat__key">Paths</span><span class="stat__val" id="s-paths">—</span></div>
      <div class="stat"><span class="stat__key">Samples</span><span class="stat__val" id="s-samples">—</span></div>
      <div class="stat"><span class="stat__key">Pen-ups</span><span class="stat__val" id="s-penups">—</span></div>
      <div class="stat"><span class="stat__key">Length</span><span class="stat__val" id="s-length">—</span></div>
      <div class="export-row">
        <button class="btn btn--block" id="export-svg">Export SVG</button>
        <button class="btn btn--block" id="export-gcode">Export G-code</button>
      </div>
    </div>
  </aside>
`;

const paper = document.getElementById("paper")!;
const controlsBody = document.getElementById("controls-body")!;

// ---- Layer operations --------------------------------------------------

function addLayer(): void {
  const layer = createLayer(active.generatorId);
  layer.strokeColor = LAYER_PALETTE[doc.layers.length % LAYER_PALETTE.length]!;
  doc.layers.push(layer);
  active = layer;
  rebuildControls();
  recompute();
}

function selectLayer(layer: Layer): void {
  active = layer;
  rebuildControls();
  recompute();
}

function duplicate(layer: Layer): void {
  const clone = duplicateLayer(layer);
  const at = doc.layers.indexOf(layer);
  doc.layers.splice(at + 1, 0, clone);
  active = clone;
  rebuildControls();
  recompute();
}

function removeLayer(layer: Layer): void {
  if (doc.layers.length <= 1 || layer.locked) return;
  const at = doc.layers.indexOf(layer);
  doc.layers.splice(at, 1);
  if (active === layer) active = doc.layers[Math.max(0, at - 1)]!;
  rebuildControls();
  recompute();
}

/** delta -1 = toward top of the visual list (later in draw order). */
function moveLayer(layer: Layer, delta: number): void {
  const at = doc.layers.indexOf(layer);
  const target = at - delta; // visual up = higher array index
  if (target < 0 || target >= doc.layers.length) return;
  const [item] = doc.layers.splice(at, 1);
  doc.layers.splice(target, 0, item!);
  rebuildControls();
  recompute();
}

// ---- Layer panel -------------------------------------------------------

function iconButton(glyph: string, title: string, pressed?: boolean): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "layer-icon";
  b.textContent = glyph;
  b.title = title;
  b.setAttribute("aria-label", title);
  if (pressed !== undefined) b.setAttribute("aria-pressed", String(pressed));
  return b;
}

function buildLayerPanel(): HTMLElement {
  const wrap = document.createElement("div");

  const head = document.createElement("div");
  head.className = "layers__head";
  head.innerHTML = `<span class="panel__title">Layers</span>`;
  const add = iconButton("＋", "Add layer");
  add.addEventListener("click", addLayer);
  head.append(add);
  wrap.append(head);

  const list = document.createElement("div");
  list.className = "layers";

  // Topmost drawn layer (last in array) shows at the top of the list.
  for (let vi = doc.layers.length - 1; vi >= 0; vi--) {
    const layer = doc.layers[vi]!;
    const gen = getGenerator(layer.generatorId);
    const row = document.createElement("div");
    row.className = "layer-row";
    if (layer === active) row.classList.add("layer-row--active");
    if (!layer.visible) row.classList.add("layer-row--hidden");

    const vis = iconButton(layer.visible ? "◉" : "⊘", layer.visible ? "Hide" : "Show", layer.visible);
    vis.addEventListener("click", (e) => {
      e.stopPropagation();
      layer.visible = !layer.visible;
      rebuildControls();
      recompute();
    });

    const lock = iconButton(layer.locked ? "▣" : "▢", layer.locked ? "Unlock" : "Lock", layer.locked);
    lock.addEventListener("click", (e) => {
      e.stopPropagation();
      layer.locked = !layer.locked;
      rebuildControls();
    });

    const swatch = document.createElement("span");
    swatch.className = "layer-row__swatch";
    swatch.style.background = layer.strokeColor;

    const label = document.createElement("div");
    label.className = "layer-row__label";
    const name = document.createElement("span");
    name.className = "layer-row__name";
    name.textContent = layer.name;
    const meta = document.createElement("span");
    meta.className = "layer-row__meta";
    const modCount = layer.modifiers.length;
    meta.textContent = `${gen?.name ?? "?"}${modCount ? ` · ${modCount} mod` : ""}`;
    label.append(name, meta);
    label.addEventListener("click", () => selectLayer(layer));

    const up = iconButton("↑", "Move up");
    up.disabled = vi === doc.layers.length - 1;
    up.addEventListener("click", (e) => {
      e.stopPropagation();
      moveLayer(layer, -1);
    });
    const down = iconButton("↓", "Move down");
    down.disabled = vi === 0;
    down.addEventListener("click", (e) => {
      e.stopPropagation();
      moveLayer(layer, 1);
    });

    const dup = iconButton("⧉", "Duplicate");
    dup.addEventListener("click", (e) => {
      e.stopPropagation();
      duplicate(layer);
    });

    const del = iconButton("✕", "Delete");
    del.disabled = doc.layers.length <= 1 || layer.locked;
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      removeLayer(layer);
    });

    row.append(vis, lock, swatch, label, up, down, dup, del);
    row.addEventListener("click", () => selectLayer(layer));
    list.append(row);
  }

  wrap.append(list);
  return wrap;
}

// ---- Controls panel (rebuilt when structure changes) -------------------

function rebuildControls(): void {
  controlsBody.replaceChildren();
  controlsBody.append(buildLayerPanel());

  const activeWrap = document.createElement("div");
  activeWrap.id = "active-controls";

  // Shape (generator) picker
  const shapeField = document.createElement("label");
  shapeField.className = "field";
  shapeField.innerHTML = `<span class="field__label">Shape</span>`;
  const shapeSelect = document.createElement("select");
  for (const gen of listGenerators()) {
    const o = document.createElement("option");
    o.value = gen.id;
    o.textContent = gen.name;
    if (gen.id === active.generatorId) o.selected = true;
    shapeSelect.append(o);
  }
  shapeSelect.addEventListener("change", () => {
    active.generatorId = shapeSelect.value;
    const gen = getGenerator(shapeSelect.value)!;
    active.params = defaultParams(gen.fields);
    active.name = gen.name;
    rebuildControls();
    recompute();
  });
  shapeField.append(shapeSelect);
  activeWrap.append(shapeField);

  // Generator params
  const gen = getGenerator(active.generatorId)!;
  activeWrap.append(sectionTitle(gen.name));
  activeWrap.append(buildFields(gen.fields, active.params, () => recompute()));

  // Stroke styling
  activeWrap.append(sectionTitle("Stroke"));
  const stroke = document.createElement("div");
  stroke.className = "field field--checkbox";
  stroke.innerHTML = `
    <div class="field__row">
      <input type="color" id="stroke-color" value="${active.strokeColor}">
      <input type="range" id="stroke-width" min="0.1" max="2" step="0.05" value="${active.strokeWidth}">
      <span class="field__value" id="stroke-width-val">${active.strokeWidth.toFixed(2)}</span>
      <span class="field__unit">mm</span>
    </div>`;
  activeWrap.append(stroke);
  stroke.querySelector<HTMLInputElement>("#stroke-color")!.addEventListener("input", (e) => {
    active.strokeColor = (e.target as HTMLInputElement).value;
    rebuildControls();
    recompute();
  });
  const swInput = stroke.querySelector<HTMLInputElement>("#stroke-width")!;
  const swVal = stroke.querySelector<HTMLSpanElement>("#stroke-width-val")!;
  swInput.addEventListener("input", () => {
    active.strokeWidth = Number(swInput.value);
    swVal.textContent = active.strokeWidth.toFixed(2);
    recompute();
  });

  // Modifier chain
  activeWrap.append(sectionTitle("Modifiers"));
  const modRow = document.createElement("div");
  modRow.className = "field__row";
  const modSelect = document.createElement("select");
  for (const mod of listModifiers()) {
    const o = document.createElement("option");
    o.value = mod.id;
    o.textContent = mod.name;
    modSelect.append(o);
  }
  const addBtn = document.createElement("button");
  addBtn.className = "btn";
  addBtn.textContent = "＋ Add";
  addBtn.addEventListener("click", () => {
    const mod = getModifier(modSelect.value)!;
    active.modifiers.push({ modifierId: mod.id, params: defaultParams(mod.fields), enabled: true });
    rebuildControls();
    recompute();
  });
  modRow.append(modSelect, addBtn);
  activeWrap.append(modRow);

  active.modifiers.forEach((inst, i) => {
    const mod = getModifier(inst.modifierId);
    if (!mod) return;
    const group = document.createElement("div");
    group.style.marginTop = "12px";
    const groupHead = document.createElement("div");
    groupHead.className = "field__row";
    groupHead.style.justifyContent = "space-between";
    groupHead.innerHTML = `<span class="field__label" style="text-transform:uppercase;letter-spacing:.1em">${mod.name}</span>`;
    const remove = document.createElement("button");
    remove.className = "btn";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      active.modifiers.splice(i, 1);
      rebuildControls();
      recompute();
    });
    groupHead.append(remove);
    group.append(groupHead);
    group.append(buildFields(mod.fields, inst.params, () => recompute()));
    activeWrap.append(group);
  });

  // Locked layers are read-only.
  if (active.locked) {
    activeWrap.classList.add("active-controls--locked");
    activeWrap
      .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button")
      .forEach((el) => (el.disabled = true));
  }

  controlsBody.append(activeWrap);
}

function sectionTitle(text: string): HTMLElement {
  const h = document.createElement("div");
  h.className = "panel__title";
  h.style.margin = "18px 0 10px";
  h.textContent = text;
  return h;
}

// ---- Recompute + render ------------------------------------------------

let lastEvaluated: ReturnType<typeof evaluateDocument> = [];

function recompute(): void {
  const evaluated = evaluateDocument(doc);
  lastEvaluated = evaluated;

  const stage = paper.parentElement!;
  const pxPerMm = fitScale(doc.page, {
    width: stage.clientWidth,
    height: stage.clientHeight,
  });
  renderInto(paper, evaluated, doc.page, { pxPerMm });

  const all = evaluated.flatMap((e) => e.paths);
  const m = metrics(all);
  text("s-size", `${doc.page.width} × ${doc.page.height} mm`);
  text("s-layers", `${evaluated.length} / ${doc.layers.length}`);
  text("s-paths", m.paths.toLocaleString());
  text("s-samples", m.samples.toLocaleString());
  text("s-penups", m.penUps.toLocaleString());
  text("s-length", `${(m.drawnLength / 10).toFixed(1)} cm`);
}

function text(id: string, value: string): void {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

// ---- Actions -----------------------------------------------------------

document.getElementById("make")!.addEventListener("click", addLayer);

document.getElementById("randomize")!.addEventListener("click", () => {
  if (active.locked) return;
  const gen = getGenerator(active.generatorId)!;
  for (const f of gen.fields) {
    if (f.type === "range") {
      const v = f.min + Math.random() * (f.max - f.min);
      active.params[f.key] = f.step >= 1 ? Math.round(v) : Math.round(v / f.step) * f.step;
    } else if (f.type === "checkbox") {
      active.params[f.key] = Math.random() > 0.5;
    }
  }
  rebuildControls();
  recompute();
});

document.getElementById("export-svg")!.addEventListener("click", () => {
  const svg = toSVG(evaluateDocument(doc), doc.page, { pageBorder: true });
  download("lineandform.svg", svg, "image/svg+xml");
});

document.getElementById("export-gcode")!.addEventListener("click", () => {
  const all = lastEvaluated.flatMap((e) => e.paths);
  const gcode = toGcode(all, GCODE_PROFILES.servo!, { optimize: true });
  download("lineandform.gcode", gcode, "text/plain");
});

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Boot --------------------------------------------------------------

rebuildControls();
recompute();

const ro = new ResizeObserver(() => recompute());
ro.observe(paper.parentElement!);

// Expose a tiny API for console tinkering / debugging.
(window as unknown as { LineForm: unknown }).LineForm = {
  doc,
  optimizeOrder,
  evaluate: () => evaluateDocument(doc),
};
