import type { Failure } from "#/failures";
import type { Wisp } from "#/contracts";
import { halt as haltSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function halt(failure: Failure): Wisp<never> {
  return wisp.liftF(haltSigil(failure));
}
