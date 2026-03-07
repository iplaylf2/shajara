import type { Wisp, ProcessCompletedExit, ProcessRef } from "#src/contracts";
import { awaitProcess } from "#src/sigils";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

/**
 * Awaits a process through the in-band completion path only.
 * Non-completed exits are treated as invalid for this helper.
 */
export function awaitProcessInBand<Return>(processRef: ProcessRef<Return>): Wisp<Return> {
  return pipe(
    awaitProcess(processRef),
    wisp.liftF,
    wisp.map(narrowAs<ProcessCompletedExit<Return>>()),
    wisp.map(({ value }) => value),
  );
}
