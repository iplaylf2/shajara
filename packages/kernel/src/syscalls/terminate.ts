import type { ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export interface TerminateSyscall<Process extends ProcessRef = ProcessRef> extends Syscall {
  readonly kind: "terminate";
  readonly process: Process;
  readonly return?: readonly [void];
}

export function terminate<Process extends ProcessRef = ProcessRef>(
  process: Process,
): TerminateSyscall<Process> {
  return {
    kind: "terminate",
    process,
  };
}
