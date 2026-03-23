import type { ECHO_TOKEN, FailureShape, SigilShape } from "#src/contracts";

export function halt(failure: FailureShape): HaltSigil {
  return { failure, kind: "halt" };
}

export interface HaltSigil extends SigilShape {
  readonly failure: FailureShape;
  readonly kind: "halt";
  readonly [ECHO_TOKEN]?: readonly [never];
}
