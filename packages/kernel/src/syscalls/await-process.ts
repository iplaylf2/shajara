import type { ProcessExit, ProcessRef } from "#src/syscalls-kit/process";
import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface AwaitProcessSyscall<
  ReturnValue = unknown,
  Process extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
> extends Syscall<ProcessExit<ReturnValue>> {
  readonly kind: "await-process";
  readonly process: Process;
}

export function awaitProcess<
  ReturnValue = unknown,
  Process extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
>(_process: Process): AwaitProcessSyscall<ReturnValue, Process> {
  return notImplemented("kernel syscall 'await-process'");
}
