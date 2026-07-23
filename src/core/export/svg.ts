/**
 * SVG serialisation. The same `pathData` helper drives both the on-screen
 * preview and the exported file, so what you see is exactly what plots. The
 * document is written with a millimetre `viewBox` and physical width/height,
 * which most plotter front-ends (AxiDraw, vpype, Inkscape) read directly.
 */

import type { Path, PathSet } from "../geometry";
import type { EvaluatedLayer } from "../document";
import type { PageSize } from "../document";

/** Round to a sane precision to keep files small. */
function n(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Build the `d` attribute for one polyline. */
export function pathData(path: Path): string {
  const { points, closed } = path;
  if (points.length === 0) return "";
  let d = `M ${n(points[0]!.x)} ${n(points[0]!.y)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${n(points[i]!.x)} ${n(points[i]!.y)}`;
  }
  if (closed) d += " Z";
  return d;
}

/** Concatenate a whole set into a single `d` with multiple sub-paths. */
export function pathSetData(set: PathSet): string {
  return set
    .map(pathData)
    .filter(Boolean)
    .join(" ");
}

export interface SvgOptions {
  /** Emit a subtle page border rectangle. */
  pageBorder?: boolean;
  background?: string;
}

export function toSVG(
  layers: EvaluatedLayer[],
  page: PageSize,
  opts: SvgOptions = {},
): string {
  const w = n(page.width);
  const h = n(page.height);
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
      `width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">`,
  );
  if (opts.background) {
    parts.push(`<rect width="${w}" height="${h}" fill="${opts.background}"/>`);
  }
  for (const { layer, paths } of layers) {
    const d = pathSetData(paths);
    if (!d) continue;
    parts.push(
      `<path d="${d}" fill="none" stroke="${layer.strokeColor}" ` +
        `stroke-width="${n(layer.strokeWidth)}" ` +
        `stroke-linecap="round" stroke-linejoin="round" ` +
        `data-layer="${escapeAttr(layer.name)}"/>`,
    );
  }
  if (opts.pageBorder) {
    parts.push(
      `<rect x="0" y="0" width="${w}" height="${h}" fill="none" ` +
        `stroke="#cccccc" stroke-width="0.1"/>`,
    );
  }
  parts.push("</svg>");
  return parts.join("\n");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
