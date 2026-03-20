import type { ECHO_TOKEN, FailureShape, SigilShape } from "#src/contracts";
import { aborted } from "#src/failures";

export function halt(failure: FailureShape = aborted()): HaltSigil {
  return { failure, kind: "halt" };
}

export interface HaltSigil extends SigilShape {
  readonly failure: FailureShape;
  readonly kind: "halt";
  readonly [ECHO_TOKEN]?: readonly [never];
}
