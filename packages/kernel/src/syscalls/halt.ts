import type { KhoraFailure } from "#src/contracts/failure";
import type { Syscall } from "#src/contracts/syscall";

export interface HaltSyscall extends Syscall {
  readonly fault?: KhoraFailure;
  readonly kind: "halt";
  readonly return?: readonly [never];
}

export function halt(fault?: KhoraFailure): HaltSyscall {
  return fault ? { fault, kind: "halt" } : { kind: "halt" };
}
