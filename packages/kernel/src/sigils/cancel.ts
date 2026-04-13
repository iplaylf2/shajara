import type { ECHO_TOKEN, SigilShape } from "#/contracts";

export function cancel(): CancelSigil {
  return { kind: "cancel" };
}

export interface CancelSigil extends SigilShape {
  readonly kind: "cancel";
  readonly [ECHO_TOKEN]?: readonly [never];
}
