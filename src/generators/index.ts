/** Register every built-in generator. Import this once at startup. */

import { registerGenerator } from "../core/registry";
import { spirograph } from "./spirograph";
import { rose } from "./rose";

export function registerGenerators(): void {
  registerGenerator(spirograph);
  registerGenerator(rose);
}
