import type { Blueprint, ProcessRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function fork<Return, Process extends ProcessRef<Return>>(
  blueprint: Blueprint<Return>,
): ForkSyscall<Return, Process> {
  return {
    blueprint,
    kind: "fork",
  };
}

export interface ForkSyscall<Return, Process extends ProcessRef<Return>> extends Syscall {
  readonly kind: "fork";
  readonly blueprint: Blueprint<Return>;
  readonly [RETURN_TOKEN]?: readonly [Process];
}
