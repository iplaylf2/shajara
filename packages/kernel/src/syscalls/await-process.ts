import type { ProcessExit, ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export interface AwaitProcessSyscall<
  ReturnValue = unknown,
  Process extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
> extends Syscall {
  readonly kind: "await-process";
  readonly process: Process;
  readonly return?: readonly [ProcessExit<ReturnValue>];
}

export function awaitProcess<
  ReturnValue = unknown,
  Process extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
>(process: Process): AwaitProcessSyscall<ReturnValue, Process> {
  return {
    kind: "await-process",
    process,
  };
}
