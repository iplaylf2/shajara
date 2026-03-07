import type { Failure, Wisp } from "#src/contracts";
import { halt as haltSigil } from "#src/sigils";
import { scopeHalted } from "#src/failures";
import { wisp } from "#src/internal/fp";

export function halt(failure: Failure = scopeHalted()): Wisp<never> {
  return wisp.liftF(haltSigil(failure));
}
