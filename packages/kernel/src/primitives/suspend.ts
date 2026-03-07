import type { Wisp } from "#src/contracts";
import { park } from "#src/primitives-kit";

export function suspend(): Wisp<never> {
  return park();
}
