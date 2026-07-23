/**
 * Warp — a sinusoidal displacement. Points are pushed along one axis by a sine
 * wave running along the other, bending straight line-work into ribbons. Purely
 * positional, so it composes with any generator or earlier modifier.
 */

import type { ModifierDef, Params } from "../core/registry";
import type { PathSet } from "../core/geometry";

const TWO_PI = Math.PI * 2;

export const warp: ModifierDef = {
  id: "warp",
  name: "Warp",
  fields: [
    {
      key: "axis",
      label: "Axis",
      type: "select",
      options: [
        { value: "horizontal", label: "Along X" },
        { value: "vertical", label: "Along Y" },
      ],
      default: "horizontal",
    },
    { key: "amplitude", label: "Amplitude", type: "range", min: 0, max: 30, step: 0.5, default: 6, unit: "mm" },
    { key: "wavelength", label: "Wavelength", type: "range", min: 5, max: 200, step: 1, default: 60, unit: "mm" },
    { key: "phase", label: "Phase", type: "range", min: 0, max: 360, step: 1, default: 0, unit: "°" },
  ],
  apply(input: PathSet, params: Params): PathSet {
    const axis = params.axis as string;
    const amp = params.amplitude as number;
    const wavelength = Math.max(0.001, params.wavelength as number);
    const phase = ((params.phase as number) * Math.PI) / 180;
    if (amp === 0) return input;
    const k = TWO_PI / wavelength;

    return input.map((path) => ({
      closed: path.closed,
      points: path.points.map((p) =>
        axis === "vertical"
          ? { x: p.x + amp * Math.sin(p.y * k + phase), y: p.y }
          : { x: p.x, y: p.y + amp * Math.sin(p.x * k + phase) },
      ),
    }));
  },
};
