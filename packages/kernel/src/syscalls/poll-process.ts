import type { ProcessExit, ProcessRef, ProcessRefReturn } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export type PollProcessResult<Return> =
  | { readonly exited: false }
  | { readonly exited: true; readonly exit: ProcessExit<Return> };

export interface PollProcessSyscall<Process extends ProcessRef<unknown>> extends Syscall {
  readonly kind: "poll-process";
  readonly process: Process;
  readonly return?: readonly [PollProcessResult<ProcessRefReturn<Process>>];
}

export function pollProcess<Process extends ProcessRef<unknown>>(
  process: Process,
): PollProcessSyscall<Process> {
  return {
    kind: "poll-process",
    process,
  };
}
