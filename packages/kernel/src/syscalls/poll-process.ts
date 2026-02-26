import type { ProcessExit, ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export type PollProcessResult<Return = unknown> =
  | { readonly exited: false }
  | { readonly exited: true; readonly exit: ProcessExit<Return> };

export interface PollProcessSyscall<
  Return = unknown,
  Process extends ProcessRef<Return> = ProcessRef<Return>,
> extends Syscall {
  readonly kind: "poll-process";
  readonly process: Process;
  readonly return?: readonly [PollProcessResult<Return>];
}

export function pollProcess<
  Return = unknown,
  Process extends ProcessRef<Return> = ProcessRef<Return>,
>(process: Process): PollProcessSyscall<Return, Process> {
  return {
    kind: "poll-process",
    process,
  };
}
