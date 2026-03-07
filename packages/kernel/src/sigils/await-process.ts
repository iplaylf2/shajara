import type { ECHO_TOKEN, ProcessExit, ProcessRef, ProcessRefRelic, Sigil } from "#src/contracts";

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
  readonly [ECHO_TOKEN]?: readonly [ProcessExit<ProcessRefRelic<Process>>];
}
