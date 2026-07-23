# Line & Form — Studio

A client-side generative **line-work and pen-plotter** design tool. Compose art
from parametric **generators**, transform it with **modifiers**, and export to
**SVG** or **G-code** at true physical (millimetre) scale.

This repository is a **clean-room scaffold** — it re-creates the architecture
and design language of the [Applied Craft · Line & Form][ref] editor as a
modern, build-tooled, testable codebase. No upstream source is copied; it is a
foundation to extend.

[ref]: https://appliedcraft.com/lineandform/editor.html

---

## Quick start

```bash
npm install
npm run dev        # Vite dev server
npm run test       # Vitest unit tests
npm run build      # typecheck + production build
```

## Architecture

The whole pipeline is **polylines in millimetres**. A generator emits paths, a
chain of modifiers transforms them, the renderer draws them, and the exporters
serialise them — the on-screen preview and the exported file use the *same*
numbers, so what you see is what plots.

```
generator ─▶ PathSet ─▶ modifier… ─▶ PathSet ─▶ ┬─▶ renderer (SVG on screen)
   (params, ctx)          (params, ctx)          ├─▶ SVG export
                                                  └─▶ G-code export
```

| Area | Files | Notes |
| --- | --- | --- |
| Geometry | `src/core/geometry.ts` | `Point` / `Path` / `PathSet`, bounds, metrics (paths · samples · pen-ups · length) |
| Font | `src/core/font.ts` | Built-in single-stroke (Hershey-style) vector font |
| Noise | `src/core/noise.ts` | Shared deterministic value noise |
| Registry | `src/core/registry.ts` | Generator/modifier registration + **field schema** |
| Document | `src/core/document.ts` | Page + layer stack, lazy evaluation, per-layer pen |
| History | `src/core/history.ts` | Generic undo/redo stack (editor stores document snapshots) |
| Path-merge | `src/core/path-merge.ts` | Join touching strokes + drop collinear points to cut pen-ups |
| Renderer | `src/core/renderer.ts` | `PathSet` → live `<svg>` with a mm `viewBox` |
| Export | `src/core/export/svg.ts`, `gcode.ts`, `hpgl.ts` | Per-pen SVG layers; multi-pen G-code + HPGL; device profiles, path-order optimisation, path-merge |
| Generators | `src/generators/*` | `spirograph`, `rose`, `flow-field`, `truchet`, `halftone`, `text-path` |
| Modifiers | `src/modifiers/*` | `jitter`, `dash`, `warp` |
| UI | `src/ui/*`, `src/main.ts` | Three-column shell; layer panel; undo/redo; controls auto-built from field schemas |

### The key idea: field schemas

A module declares its parameters as data; the editor builds the control panel
automatically. **Adding a generator or modifier is one self-contained file with
no UI wiring.** For example:

```ts
export const spiral: GeneratorDef = {
  id: "spiral",
  name: "Spiral",
  fields: [
    { key: "turns", label: "Turns", type: "range", min: 1, max: 40, step: 1, default: 8 },
    { key: "gap",   label: "Gap",   type: "range", min: 1, max: 20, step: 0.5, default: 4, unit: "mm" },
  ],
  generate(params, ctx) { /* return PathSet */ },
};
```

Register it in `src/generators/index.ts` and it appears in the Shape picker.

## Design system

Tokens live in `src/styles/tokens.css` — a "technical atelier" palette (warm
paper, graphite ink, monospaced instrument readouts, a pine-green workspace
accent, three signal colours) that is light/dark aware. See
[`docs/design-notes.md`](docs/design-notes.md) for the analysis this was
distilled from.

## Roadmap

Four active tracks:

1. **Generators / modifiers** — flow-field, truchet, halftone, text-on-path,
   warp (done); next: 3D projection; boolean-clip and offset modifiers.
2. **Export & device output** — device profiles (servo / Z-hop / GRBL),
   per-layer pen mapping, multi-pen G-code with pause-between-pens, per-pen SVG
   layers, HPGL export, path-merge to cut pen-ups (done); next: per-pen
   speed/pressure, plot-time estimate.
3. **UX / design polish** — layer panel, undo/redo (coalesced) with ⌘Z/⌘⇧Z
   (done); next: gallery, mobile-tuned layout, snapshots.
4. **Architecture / build** — this scaffold (done); next: worker-thread
   evaluation for heavy generators, snapshot/versioning, plugin loading.

## License

MIT — see [LICENSE](LICENSE). Independent implementation; not affiliated with
Applied Craft.
