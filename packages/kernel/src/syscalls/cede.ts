import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface CedeSyscall extends Syscall {
  readonly kind: "cede";
  readonly return: readonly [void];
}

export function cede(): CedeSyscall {
  return notImplemented("kernel syscall 'cede'");
}
