import type { Blueprint, ProcessRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export interface ForkSyscall<Return, ForkedProcess extends ProcessRef<Return>> extends Syscall {
  readonly kind: "fork";
  readonly blueprint: Blueprint<Return>;
  readonly [RETURN_TOKEN]?: readonly [ForkedProcess];
}

export function fork<Return, ForkedProcess extends ProcessRef<Return>>(
  blueprint: Blueprint<Return>,
): ForkSyscall<Return, ForkedProcess> {
  return {
    blueprint,
    kind: "fork",
  };
}
