import type { Syscall } from "#src/contracts/syscall";

export interface CedeSyscall extends Syscall {
  readonly kind: "cede";
  readonly return?: readonly [void];
}

export function cede(): CedeSyscall {
  return {
    kind: "cede",
  };
}
