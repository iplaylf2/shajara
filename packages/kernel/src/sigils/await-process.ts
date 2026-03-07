import type { ProcessExit, ProcessRef, ProcessRefRelic, Sigil } from "#src/contracts";
import type { RETURN_TOKEN } from "#src/utils";

export function awaitProcess<Process extends ProcessRef<unknown>>(
  process: Process,
): AwaitProcessSigil<Process> {
  return {
    kind: "await-process",
    process,
  };
}

export interface AwaitProcessSigil<Process extends ProcessRef<unknown>> extends Sigil {
  readonly kind: "await-process";
  readonly process: Process;
  readonly [RETURN_TOKEN]?: readonly [ProcessExit<ProcessRefRelic<Process>>];
}
