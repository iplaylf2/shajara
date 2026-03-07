import type { ECHO_TOKEN, Failure, Sigil } from "#src/contracts";
import { scopeHalted } from "#src/failures";

export function halt(failure: Failure = scopeHalted()): HaltSigil {
  return { failure, kind: "halt" };
}

export interface HaltSigil extends Sigil {
  readonly failure: Failure;
  readonly kind: "halt";
  readonly [ECHO_TOKEN]?: readonly [never];
}
