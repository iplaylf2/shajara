import type { Syscall } from "#src/contracts/syscall";

export interface HaltSyscall extends Syscall {
  readonly kind: "halt";
  readonly return?: readonly [never];
}

export function halt(): HaltSyscall {
  return {
    kind: "halt",
  };
}
