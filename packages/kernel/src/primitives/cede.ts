import type { Wisp } from "#/contracts/index.js";
import { cede as cedeSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/** Cedes the current turn before the process continues. */
export function cede(): Wisp<void> {
  return wisp.liftF(cedeSigil());
}
