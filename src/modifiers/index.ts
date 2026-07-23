/** Register every built-in modifier. Import this once at startup. */

import { registerModifier } from "../core/registry";
import { jitter } from "./jitter";
import { dash } from "./dash";
import { warp } from "./warp";

export function registerModifiers(): void {
  registerModifier(jitter);
  registerModifier(dash);
  registerModifier(warp);
}
