import type { ProcessExit, ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export type PollProcessResult<ReturnValue = unknown> =
  | { readonly exited: false }
  | { readonly exited: true; readonly exit: ProcessExit<ReturnValue> };

export interface PollProcessSyscall<
  ReturnValue = unknown,
  Process extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
> extends Syscall {
  readonly kind: "poll-process";
  readonly process: Process;
  readonly return?: readonly [PollProcessResult<ReturnValue>];
}

export function pollProcess<
  ReturnValue = unknown,
  Process extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
>(process: Process): PollProcessSyscall<ReturnValue, Process> {
  return {
    kind: "poll-process",
    process,
  };
}
