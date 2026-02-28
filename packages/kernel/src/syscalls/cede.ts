import type { RETURN_TOKEN } from "#src/utils";
import type { Syscall } from "#src/contracts";

export function cede(): CedeSyscall {
  return {
    kind: "cede",
  };
}

export interface CedeSyscall extends Syscall {
  readonly kind: "cede";
  readonly [RETURN_TOKEN]?: readonly [void];
}
