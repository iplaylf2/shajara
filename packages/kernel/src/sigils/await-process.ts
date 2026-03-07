import type { ProcessExit, ProcessRef, ProcessRefReturn, Sigil } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function awaitProcess<Process extends ProcessRef<unknown>>(
  process: Process,
): AwaitProcessSyscall<Process> {
  return {
    kind: "await-process",
    process,
  };
}

export interface AwaitProcessSyscall<Process extends ProcessRef<unknown>> extends Sigil {
  readonly kind: "await-process";
  readonly process: Process;
  readonly [RETURN_TOKEN]?: readonly [ProcessExit<ProcessRefReturn<Process>>];
}
