import type { Failure } from "#/failures";
import type { Wisp } from "#/contracts";
import { halt as haltSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Fails the current process in band.
 *
 * @param failure - Failure value.
 * @returns No relic.
 */
export function halt(failure: Failure): Wisp<never> {
  return wisp.liftF(haltSigil(failure));
}
