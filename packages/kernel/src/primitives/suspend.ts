import type { Plan } from "#src/contracts";
import { park } from "#src/primitives-kit";

export function suspend(): Plan<never> {
  return park();
}
