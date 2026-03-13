import type { FailureShape, Wisp } from "#src/contracts";
import { halt as haltSigil } from "#src/sigils";
import { scopeHalted } from "#src/failures";
import { wisp } from "#src/internal/fp";

export function halt(failure: FailureShape = scopeHalted()): Wisp<never> {
  return wisp.liftF(haltSigil(failure));
}
