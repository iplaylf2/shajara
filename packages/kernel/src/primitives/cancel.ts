import type { Wisp } from "#/contracts";
import { cancel as cancelSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Requests current-scope cancellation.
 *
 * @returns No relic.
 */
export function cancel(): Wisp<never> {
  return wisp.liftF(cancelSigil());
}
