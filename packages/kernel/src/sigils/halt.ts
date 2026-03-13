import type { ECHO_TOKEN, FailureShape, SigilShape } from "#src/contracts";
import { scopeHalted } from "#src/failures";

export function halt(failure: FailureShape = scopeHalted()): HaltSigil {
  return { failure, kind: "halt" };
}

export interface HaltSigil extends SigilShape {
  readonly failure: FailureShape;
  readonly kind: "halt";
  readonly [ECHO_TOKEN]?: readonly [never];
}
