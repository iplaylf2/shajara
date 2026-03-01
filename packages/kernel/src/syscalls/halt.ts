import type { Failure, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function halt(fault?: Failure): HaltSyscall {
  return fault ? { fault, kind: "halt" } : { kind: "halt" };
}

export interface HaltSyscall extends Syscall {
  readonly fault?: Failure;
  readonly kind: "halt";
  readonly [RETURN_TOKEN]?: readonly [never];
}
