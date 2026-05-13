import type { Wisp } from "#/contracts";
import { cede as cedeSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/** Yields cooperatively before the current process continues. */
export function cede(): Wisp<void> {
  return wisp.liftF(cedeSigil());
}
