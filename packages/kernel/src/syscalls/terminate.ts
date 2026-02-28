import type { ProcessRef, Syscall } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function terminate<Process extends ProcessRef<unknown>>(
  process: Process,
): TerminateSyscall<Process> {
  return {
    kind: "terminate",
    process,
  };
}

export interface TerminateSyscall<Process extends ProcessRef<unknown>> extends Syscall {
  readonly kind: "terminate";
  readonly process: Process;
  readonly [RETURN_TOKEN]?: readonly [void];
}
