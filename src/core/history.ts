/**
 * Undo/redo stack. Deliberately generic and state-agnostic: the editor stores
 * serialized document snapshots (strings) as `T`, but this knows nothing about
 * documents. `present` always mirrors the live state; `push` records a new
 * present and drops any redo future; `undo`/`redo` walk the two side stacks.
 */

export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  private present: T;

  constructor(
    initial: T,
    private readonly limit = 100,
  ) {
    this.present = initial;
  }

  get current(): T {
    return this.present;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Record a new present state, clearing the redo future. */
  push(state: T): void {
    this.past.push(this.present);
    if (this.past.length > this.limit) this.past.shift();
    this.present = state;
    this.future = [];
  }

  undo(): T | null {
    const prev = this.past.pop();
    if (prev === undefined) return null;
    this.future.unshift(this.present);
    this.present = prev;
    return this.present;
  }

  redo(): T | null {
    const next = this.future.shift();
    if (next === undefined) return null;
    this.past.push(this.present);
    this.present = next;
    return this.present;
  }
}
