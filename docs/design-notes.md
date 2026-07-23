# Design notes — Line & Form

Distilled from an analysis of the reference editor. These are the design
decisions the scaffold is built to honour.

## Concept

A generative-art tool whose output is **physical**: paths in millimetres,
destined for a pen plotter or CNC. Telemetry speaks the plotter's language —
*paths*, *samples*, *pen-ups* — not screen pixels.

## Layout

Three columns plus a floating tool rail:

- **Left — Controls.** Brand, primary verbs (Make / Modify), the active layer's
  generator parameters, stroke styling, and its modifier chain.
- **Centre — Stage.** A paper sheet on a gridded workspace, tool rail floating
  at the left edge.
- **Right — Drawing Order.** A completion gauge and instrument-style stats, with
  export actions.

## Design language: "technical atelier"

| Token group | Values |
| --- | --- |
| Paper / surfaces | `--bg #f6f6f3`, `--paper #fdfdfb`, soft edges, low-opacity shadows |
| Ink | `--ink #131313`, `--muted #6b6b66`, `--graphite #1f1f1d` |
| Signal accents | yellow `#f2d34f`, orange `#f47a2a`, green `#2fa765` |
| Workspace accent | pine `rgb(15,106,84)`, buttons `#26473f → #17352e` |
| Type — UI | Helvetica Neue / Avenir Next / Segoe UI |
| Type — data | **monospace** (SF Mono / Menlo) for every numeric readout |
| Shape | radii 14 / 10 / 7 px; range sliders with numeric chips |

The defining move is **monospaced data readouts**: measurements read like
instrument gauges, which sells the "precision instrument" feel.

## Technical posture of the reference

- Framework-free, no bundler: ~110 hand-ordered `<script>` tags, cache-busted.
- ~60 generator/modifier modules; vendored `opentype.js`, `clipper.js`,
  `leaflet`; Hershey + single-line relief fonts for plotter-native text.

**What we change:** keep the framework-free spirit, but put a real build,
ES-modules, TypeScript and tests underneath so the module set can grow without
the hand-ordered-script fragility.
