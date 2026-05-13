import type { Wisp } from "#/contracts";
import { cede as cedeSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/** Cedes the current turn before the process continues. */
export function cede(): Wisp<void> {
  return wisp.liftF(cedeSigil());
}
