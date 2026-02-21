import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface HaltSyscall extends Syscall<never> {
  readonly kind: "halt";
}

export function halt(): HaltSyscall {
  return notImplemented("kernel syscall 'halt'");
}
