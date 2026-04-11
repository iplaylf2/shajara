import type { ECHO_TOKEN, SigilShape } from "#/contracts";

export function cede(): CedeSigil {
  return {
    kind: "cede",
  };
}

export interface CedeSigil extends SigilShape {
  readonly kind: "cede";
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
