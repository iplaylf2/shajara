import type { Wisp } from "#/contracts/index.js";
import { cancel as cancelSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/** Moves the current scope onto the cancellation path and does not resume the process. */
export function cancel(): Wisp<never> {
  return wisp.liftF(cancelSigil());
}
