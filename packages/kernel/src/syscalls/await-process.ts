import type { ProcessExit, ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export interface AwaitProcessSyscall<Return, Process extends ProcessRef<Return>> extends Syscall {
  readonly kind: "await-process";
  readonly process: Process;
  readonly return?: readonly [ProcessExit<Return>];
}

export function awaitProcess<Return, Process extends ProcessRef<Return>>(
  process: Process,
): AwaitProcessSyscall<Return, Process> {
  return {
    kind: "await-process",
    process,
  };
}
