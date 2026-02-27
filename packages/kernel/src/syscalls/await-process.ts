import type { ProcessExit, ProcessRef, ProcessRefReturn } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export interface AwaitProcessSyscall<Process extends ProcessRef<unknown>> extends Syscall {
  readonly kind: "await-process";
  readonly process: Process;
  readonly return?: readonly [ProcessExit<ProcessRefReturn<Process>>];
}

export function awaitProcess<Process extends ProcessRef<unknown>>(
  process: Process,
): AwaitProcessSyscall<Process> {
  return {
    kind: "await-process",
    process,
  };
}
