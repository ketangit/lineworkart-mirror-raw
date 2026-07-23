import { describe, it, expect } from "vitest";
import { History } from "../src/core/history";

describe("History", () => {
  it("starts with no undo/redo available", () => {
    const h = new History("a");
    expect(h.current).toBe("a");
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
  });

  it("walks back and forward through pushed states", () => {
    const h = new History("a");
    h.push("b");
    h.push("c");
    expect(h.current).toBe("c");
    expect(h.undo()).toBe("b");
    expect(h.undo()).toBe("a");
    expect(h.canUndo).toBe(false);
    expect(h.redo()).toBe("b");
    expect(h.redo()).toBe("c");
    expect(h.canRedo).toBe(false);
  });

  it("returns null past the ends", () => {
    const h = new History("a");
    expect(h.undo()).toBeNull();
    h.push("b");
    h.undo();
    expect(h.redo()).toBe("b");
    expect(h.redo()).toBeNull();
  });

  it("clears the redo future on a new push", () => {
    const h = new History("a");
    h.push("b");
    h.undo(); // back to "a", future = ["b"]
    expect(h.canRedo).toBe(true);
    h.push("c"); // new branch
    expect(h.canRedo).toBe(false);
    expect(h.current).toBe("c");
    expect(h.undo()).toBe("a");
  });

  it("trims the oldest history beyond the limit", () => {
    const h = new History("s0", 3);
    for (let i = 1; i <= 10; i++) h.push(`s${i}`);
    // limit 3 keeps at most 3 undo steps
    let steps = 0;
    while (h.canUndo) {
      h.undo();
      steps++;
    }
    expect(steps).toBe(3);
  });
});
