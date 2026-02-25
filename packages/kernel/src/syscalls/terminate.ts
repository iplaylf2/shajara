import type { ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";
import { notImplemented } from "#src/internal/not-implemented";

export interface TerminateSyscall<Process extends ProcessRef = ProcessRef> extends Syscall {
  readonly kind: "terminate";
  readonly process: Process;
  readonly return: readonly [void];
}

export function terminate<Process extends ProcessRef = ProcessRef>(
  _process: Process,
): TerminateSyscall<Process> {
  return notImplemented("kernel syscall 'terminate'");
}
