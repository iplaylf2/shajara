import type { Blueprint } from "#src/plan";
import type { ProcessRef } from "#src/syscalls-kit/process";
import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface ForkSyscall<
  ReturnValue = unknown,
  ForkedProcess extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
> extends Syscall<ForkedProcess> {
  readonly kind: "fork";
  readonly blueprint: Blueprint<ReturnValue>;
}

export function fork<
  ReturnValue = unknown,
  ForkedProcess extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
>(_blueprint: Blueprint<ReturnValue>): ForkSyscall<ReturnValue, ForkedProcess> {
  return notImplemented("kernel syscall 'fork'");
}
