import type { Blueprint } from "#src/contracts/plan";
import type { ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export interface ForkSyscall<Return, ForkedProcess extends ProcessRef<Return>> extends Syscall {
  readonly kind: "fork";
  readonly blueprint: Blueprint<Return>;
  readonly return?: readonly [ForkedProcess];
}

export function fork<Return, ForkedProcess extends ProcessRef<Return>>(
  blueprint: Blueprint<Return>,
): ForkSyscall<Return, ForkedProcess> {
  return {
    blueprint,
    kind: "fork",
  };
}
