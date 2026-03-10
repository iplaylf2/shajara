import type { ProcessRef, Wisp } from "#src/contracts";
import type { Right } from "#src/utils";
import { awaitFuture } from "#src/primitives/await-future";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";

/**
 * Awaits a process through the in-band completion path only.
 * Non-completed exits are treated as invalid for this helper.
 */
export function awaitProcessInBand<Relic>(processRef: ProcessRef<Relic>): Wisp<Relic> {
  return pipe(
    awaitFuture(processRef.exitFuture),
    wisp.map(narrowAs<Right<Relic>>()),
    wisp.map(({ right }) => right),
  );
}
