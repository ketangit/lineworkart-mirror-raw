/** Register every built-in modifier. Import this once at startup. */

import { registerModifier } from "../core/registry";
import { jitter } from "./jitter";
import { dash } from "./dash";

export function registerModifiers(): void {
  registerModifier(jitter);
  registerModifier(dash);
}
