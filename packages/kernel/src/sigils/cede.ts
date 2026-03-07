import type { RETURN_TOKEN, Sigil } from "#src/contracts";

export function cede(): CedeSigil {
  return {
    kind: "cede",
  };
}

export interface CedeSigil extends Sigil {
  readonly kind: "cede";
  readonly [RETURN_TOKEN]?: readonly [void];
}
