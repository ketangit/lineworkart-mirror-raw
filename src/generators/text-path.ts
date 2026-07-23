/**
 * Text on a path. Lays a single-stroke font (see core/font) along a baseline
 * curve — straight, arc, wave, or a full circle. Each glyph is placed rigidly
 * in the local frame (tangent + up-normal) at its centre along the curve, so
 * letters follow and rotate with the baseline. Output is centred on the origin;
 * the layer then centres it on the page.
 */

import type { GeneratorDef, Params, GeneratorContext } from "../core/registry";
import type { Path } from "../core/geometry";
import { CAP_HEIGHT, glyphFor } from "../core/font";

const TWO_PI = Math.PI * 2;

interface Frame {
  x: number;
  y: number;
  tx: number;
  ty: number; // unit tangent
  nx: number;
  ny: number; // unit "up" normal (toward cap)
}

export const textPath: GeneratorDef = {
  id: "text-path",
  name: "Text on path",
  fields: [
    { key: "text", label: "Text", type: "text", default: "LINE & FORM" },
    { key: "size", label: "Size", type: "range", min: 4, max: 48, step: 1, default: 18, unit: "mm" },
    { key: "tracking", label: "Tracking", type: "range", min: -2, max: 10, step: 0.5, default: 1.5, unit: "mm" },
    {
      key: "path",
      label: "Baseline",
      type: "select",
      options: [
        { value: "straight", label: "Straight" },
        { value: "arc", label: "Arc" },
        { value: "wave", label: "Wave" },
        { value: "circle", label: "Circle" },
      ],
      default: "arc",
    },
    { key: "radius", label: "Radius", type: "range", min: 20, max: 160, step: 1, default: 80, unit: "mm" },
    { key: "amplitude", label: "Wave amplitude", type: "range", min: 0, max: 40, step: 1, default: 12, unit: "mm" },
    { key: "wavelength", label: "Wavelength", type: "range", min: 20, max: 250, step: 1, default: 120, unit: "mm" },
  ],
  generate(params: Params, _ctx: GeneratorContext): Path[] {
    const text = String(params.text ?? "");
    const size = params.size as number;
    const tracking = params.tracking as number;
    const kind = params.path as string;
    const radius = Math.max(1, params.radius as number);
    const amplitude = params.amplitude as number;
    const wavelength = Math.max(1, params.wavelength as number);

    const scale = size / CAP_HEIGHT;
    const chars = [...text];
    if (chars.length === 0) return [];

    // Advance of each glyph (box width * scale + tracking).
    const glyphs = chars.map((ch) => glyphFor(ch));
    const advances = glyphs.map((g) => g.width * scale + tracking);
    const total = advances.reduce((a, b) => a + b, 0);

    const waveK = TWO_PI / wavelength;

    const frameAt = (p: number): Frame => {
      if (kind === "wave") {
        const y = amplitude * Math.sin(waveK * p);
        const dy = amplitude * waveK * Math.cos(waveK * p);
        const len = Math.hypot(1, dy);
        const tx = 1 / len;
        const ty = dy / len;
        return { x: p, y, tx, ty, nx: ty, ny: -tx };
      }
      if (kind === "arc") {
        const a = p / radius;
        const tx = Math.cos(a);
        const ty = -Math.sin(a);
        return { x: radius * Math.sin(a), y: -radius * (1 - Math.cos(a)), tx, ty, nx: ty, ny: -tx };
      }
      if (kind === "circle") {
        const a = p / radius;
        return {
          x: radius * Math.sin(a),
          y: -radius * Math.cos(a),
          tx: Math.cos(a),
          ty: Math.sin(a),
          nx: Math.sin(a),
          ny: -Math.cos(a),
        };
      }
      // straight
      return { x: p, y: 0, tx: 1, ty: 0, nx: 0, ny: -1 };
    };

    const paths: Path[] = [];
    let cursor = -total / 2; // centre the whole run on the curve origin
    for (let gi = 0; gi < glyphs.length; gi++) {
      const g = glyphs[gi]!;
      const glyphW = g.width * scale;
      const p = cursor + glyphW / 2; // param at the glyph's horizontal centre
      const f = frameAt(p);
      for (const stroke of g.strokes) {
        const pts = stroke.map(([gx, gy]) => {
          const lx = gx! * scale - glyphW / 2; // local x, centred
          const ly = gy! * scale; // local y (up)
          return {
            x: f.x + lx * f.tx + ly * f.nx,
            y: f.y + lx * f.ty + ly * f.ny,
          };
        });
        paths.push({ points: pts, closed: false });
      }
      cursor += advances[gi]!;
    }
    return paths;
  },
};
