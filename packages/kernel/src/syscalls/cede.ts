import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface CedeSyscall extends Syscall<void> {
  readonly kind: "cede";
}

export function cede(): CedeSyscall {
  return notImplemented("kernel syscall 'cede'");
}
