import type { FailureShape, Wisp } from "#/contracts";
import { halt as haltSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export function halt(failure: FailureShape): Wisp<never> {
  return wisp.liftF(haltSigil(failure));
}
