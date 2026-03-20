import type { FailureShape, Wisp } from "#src/contracts";
import { aborted } from "#src/failures";
import { halt as haltSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function halt(failure: FailureShape = aborted()): Wisp<never> {
  return wisp.liftF(haltSigil(failure));
}
