import type { FailureShape, Wisp } from "#src/contracts";
import { halt as haltSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function halt(failure: FailureShape): Wisp<never> {
  return wisp.liftF(haltSigil(failure));
}
