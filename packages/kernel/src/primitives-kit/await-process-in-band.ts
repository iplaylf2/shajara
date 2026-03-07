import type { Wisp, ProcessCompletedExit, ProcessRef } from "#src/contracts";
import { awaitProcess } from "#src/syscalls";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";

/**
 * Awaits a process through the in-band completion path only.
 * Non-completed exits are treated as invalid for this helper.
 */
export function awaitProcessInBand<Return>(processRef: ProcessRef<Return>): Wisp<Return> {
  return pipe(
    awaitProcess(processRef),
    plan.liftF,
    plan.map(narrowAs<ProcessCompletedExit<Return>>()),
    plan.map(({ value }) => value),
  );
}
