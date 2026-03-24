import type { ECHO_TOKEN, SigilShape } from "#/contracts";

export function cede(): CedeSigil {
  return {
    kind: "cede",
  };
}

export interface CedeSigil extends SigilShape {
  readonly kind: "cede";
  readonly [ECHO_TOKEN]?: readonly [void];
}
