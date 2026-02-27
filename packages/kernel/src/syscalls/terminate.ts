import type { ProcessRef } from "#src/contracts/process";
import type { Syscall } from "#src/contracts/syscall";

export interface TerminateSyscall<Process extends ProcessRef<unknown>> extends Syscall {
  readonly kind: "terminate";
  readonly process: Process;
  readonly return?: readonly [void];
}

export function terminate<Process extends ProcessRef<unknown>>(
  process: Process,
): TerminateSyscall<Process> {
  return {
    kind: "terminate",
    process,
  };
}
