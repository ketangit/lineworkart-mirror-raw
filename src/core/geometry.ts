/**
 * Geometry primitives. Everything downstream of a generator is a set of
 * polylines expressed in millimetres, so a design can be plotted at true
 * physical scale. Curves are sampled to points at generation time.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Path {
  points: Point[];
  /** Whether the last point connects back to the first. */
  closed: boolean;
}

export type PathSet = Path[];

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Metrics {
  /** Number of separate polylines. */
  paths: number;
  /** Total number of sampled points across all paths. */
  samples: number;
  /** Pen-lift travel moves between paths (one per gap). */
  penUps: number;
  /** Total drawn length in millimetres (excludes travel moves). */
  drawnLength: number;
}

export function makePath(points: Point[], closed = false): Path {
  return { points, closed };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Length of a single path, following a closing segment when `closed`. */
export function pathLength(path: Path): number {
  const { points, closed } = path;
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1]!, points[i]!);
  }
  if (closed) total += distance(points[points.length - 1]!, points[0]!);
  return total;
}

export function bounds(set: PathSet): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const path of set) {
    for (const p of path.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

export function metrics(set: PathSet): Metrics {
  const drawable = set.filter((p) => p.points.length > 0);
  const samples = drawable.reduce((n, p) => n + p.points.length, 0);
  const drawnLength = drawable.reduce((n, p) => n + pathLength(p), 0);
  return {
    paths: drawable.length,
    samples,
    penUps: Math.max(0, drawable.length - 1),
    drawnLength,
  };
}

/** Translate every point in place-free (returns a new set). */
export function translate(set: PathSet, dx: number, dy: number): PathSet {
  return set.map((path) => ({
    closed: path.closed,
    points: path.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  }));
}

/** Scale about the origin (returns a new set). */
export function scale(set: PathSet, sx: number, sy = sx): PathSet {
  return set.map((path) => ({
    closed: path.closed,
    points: path.points.map((p) => ({ x: p.x * sx, y: p.y * sy })),
  }));
}

/** Centre a set inside a `w × h` page, preserving its size. */
export function centerInPage(set: PathSet, w: number, h: number): PathSet {
  const b = bounds(set);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  return translate(set, w / 2 - cx, h / 2 - cy);
}
