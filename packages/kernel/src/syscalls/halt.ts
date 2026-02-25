import type { Syscall } from "#src/contracts/syscall";

export interface HaltSyscall extends Syscall {
  readonly fault?: unknown;
  readonly kind: "halt";
  readonly return?: readonly [never];
}

export function halt(fault?: unknown): HaltSyscall {
  return {
    fault,
    kind: "halt",
  };
}
