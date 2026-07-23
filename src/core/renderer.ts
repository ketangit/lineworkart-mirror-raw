/**
 * On-screen renderer. Builds a single SVG element sized to the page, with a
 * millimetre `viewBox` so layer coordinates map 1:1 to the exported file. The
 * screen scale is applied only to the element's pixel width/height, never to
 * the geometry — the preview and the plot are the same numbers.
 */

import type { EvaluatedLayer, PageSize } from "./document";
import { pathSetData } from "./export/svg";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface RenderOptions {
  /** Pixels per millimetre for the on-screen element. */
  pxPerMm: number;
}

export function renderInto(
  host: HTMLElement,
  layers: EvaluatedLayer[],
  page: PageSize,
  opts: RenderOptions,
): SVGSVGElement {
  host.replaceChildren();

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${page.width} ${page.height}`);
  svg.setAttribute("width", `${page.width * opts.pxPerMm}`);
  svg.setAttribute("height", `${page.height * opts.pxPerMm}`);
  svg.setAttribute("shape-rendering", "geometricPrecision");

  for (const { layer, paths } of layers) {
    const d = pathSetData(paths);
    if (!d) continue;
    const el = document.createElementNS(SVG_NS, "path");
    el.setAttribute("d", d);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", layer.strokeColor);
    el.setAttribute("stroke-width", String(layer.strokeWidth));
    el.setAttribute("stroke-linecap", "round");
    el.setAttribute("stroke-linejoin", "round");
    el.dataset.layer = layer.id;
    svg.appendChild(el);
  }

  host.appendChild(svg);
  return svg;
}

/** Fit `pxPerMm` so the page fills `avail` (px) with a margin. */
export function fitScale(
  page: PageSize,
  avail: { width: number; height: number },
  marginPx = 48,
): number {
  const w = Math.max(1, avail.width - marginPx * 2);
  const h = Math.max(1, avail.height - marginPx * 2);
  return Math.max(0.1, Math.min(w / page.width, h / page.height));
}
