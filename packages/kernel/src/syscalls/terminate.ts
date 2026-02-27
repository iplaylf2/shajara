import type { ProcessRef, Syscall } from "#src/contracts";

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
