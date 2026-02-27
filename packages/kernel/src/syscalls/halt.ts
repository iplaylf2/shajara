import type { KhoraFailure, Syscall } from "#src/contracts";

export interface HaltSyscall extends Syscall {
  readonly fault?: KhoraFailure;
  readonly kind: "halt";
  readonly return?: readonly [never];
}

export function halt(fault?: KhoraFailure): HaltSyscall {
  return fault ? { fault, kind: "halt" } : { kind: "halt" };
}
