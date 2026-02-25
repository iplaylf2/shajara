import type { Blueprint } from "#src/contracts/plan";
import type { ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export interface ForkSyscall<
  ReturnValue = unknown,
  ForkedProcess extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
> extends Syscall {
  readonly kind: "fork";
  readonly blueprint: Blueprint<ReturnValue>;
  readonly return?: readonly [ForkedProcess];
}

export function fork<
  ReturnValue = unknown,
  ForkedProcess extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
>(blueprint: Blueprint<ReturnValue>): ForkSyscall<ReturnValue, ForkedProcess> {
  return {
    blueprint,
    kind: "fork",
  };
}
