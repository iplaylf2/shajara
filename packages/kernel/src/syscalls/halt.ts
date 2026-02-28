import type { KhoraFailure, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function halt(fault?: KhoraFailure): HaltSyscall {
  return fault ? { fault, kind: "halt" } : { kind: "halt" };
}

export interface HaltSyscall extends Syscall {
  readonly fault?: KhoraFailure;
  readonly kind: "halt";
  readonly [RETURN_TOKEN]?: readonly [never];
}
