import type { Ritual, Wisp } from "#/contracts";
import { defer as deferSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/** Registers cleanup that runs when the current process exits or is unwound. */
export function defer(cleanup: Ritual<void>): Wisp<void> {
  return wisp.liftF(deferSigil(cleanup));
}
