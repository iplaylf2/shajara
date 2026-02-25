import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface HaltSyscall extends Syscall {
  readonly kind: "halt";
  readonly return: readonly [never];
}

export function halt(): HaltSyscall {
  return notImplemented("kernel syscall 'halt'");
}
