import type { ECHO_TOKEN, Sigil } from "#src/contracts";

export function cede(): CedeSigil {
  return {
    kind: "cede",
  };
}

export interface CedeSigil extends Sigil {
  readonly kind: "cede";
  readonly [ECHO_TOKEN]?: readonly [void];
}
