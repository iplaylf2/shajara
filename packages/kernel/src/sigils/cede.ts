import type { RETURN_TOKEN } from "#src/utils";
import type { Sigil } from "#src/contracts";

export function cede(): CedeSyscall {
  return {
    kind: "cede",
  };
}

export interface CedeSyscall extends Sigil {
  readonly kind: "cede";
  readonly [RETURN_TOKEN]?: readonly [void];
}
