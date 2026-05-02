import type { ECHO_TOKEN, SigilShape } from "#/contracts";
import type { Failure } from "#/failures";

export function halt(failure: Failure): HaltSigil {
  return { failure, kind: "halt" };
}

export interface HaltSigil extends SigilShape {
  readonly failure: Failure;
  readonly kind: "halt";
  readonly [ECHO_TOKEN]?: readonly [never];
}
