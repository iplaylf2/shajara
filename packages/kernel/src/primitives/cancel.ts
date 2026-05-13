import type { Wisp } from "#/contracts";
import { cancel as cancelSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/** Moves the current scope onto the cancellation path and does not resume the process. */
export function cancel(): Wisp<never> {
  return wisp.liftF(cancelSigil());
}
