import type { Failure, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";
import { scopeHalted } from "#src/failures";

export function halt(fault: Failure = scopeHalted()): HaltSyscall {
  return { fault, kind: "halt" };
}

export interface HaltSyscall extends Syscall {
  readonly fault: Failure;
  readonly kind: "halt";
  readonly [RETURN_TOKEN]?: readonly [never];
}
