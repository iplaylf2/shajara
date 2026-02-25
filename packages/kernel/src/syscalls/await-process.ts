import type { ProcessExit, ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface AwaitProcessSyscall<
  ReturnValue = unknown,
  Process extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
> extends Syscall {
  readonly kind: "await-process";
  readonly process: Process;
  readonly return: readonly [ProcessExit<ReturnValue>];
}

export function awaitProcess<
  ReturnValue = unknown,
  Process extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
>(_process: Process): AwaitProcessSyscall<ReturnValue, Process> {
  return notImplemented("kernel syscall 'await-process'");
}
