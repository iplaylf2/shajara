import type { Ritual, Wisp } from "#/contracts/index.js";
import { defer as deferSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/** Registers cleanup that runs when the current process exits or is unwound. */
export function defer(cleanup: Ritual<void>): Wisp<void> {
  return wisp.liftF(deferSigil(cleanup));
}
