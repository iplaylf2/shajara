import type { ProcessExit, ProcessRef } from "#src/syscalls-kit/process";
import type { Syscall } from "#src/syscalls-kit/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export type PollProcessResult<ReturnValue = unknown> =
  | { readonly exited: false }
  | { readonly exited: true; readonly exit: ProcessExit<ReturnValue> };

export interface PollProcessSyscall<
  ReturnValue = unknown,
  Process extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
> extends Syscall<PollProcessResult<ReturnValue>> {
  readonly kind: "poll-process";
  readonly process: Process;
}

export function pollProcess<
  ReturnValue = unknown,
  Process extends ProcessRef<ReturnValue> = ProcessRef<ReturnValue>,
>(_process: Process): PollProcessSyscall<ReturnValue, Process> {
  return notImplemented("kernel syscall 'poll-process'");
}
