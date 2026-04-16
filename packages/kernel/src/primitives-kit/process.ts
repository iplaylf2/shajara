import type { ProcessRef, Wisp } from "#/contracts";
import type { either } from "fp-ts";
import { narrowAs } from "#/utils/index";
import { pipe } from "fp-ts/function";
import { wait } from "#/sigils/index";
import { wisp } from "#/internal/fp";

/**
 * Awaits a process through the in-band completion path only.
 * Non-completed exits are treated as invalid for this helper.
 */
export function awaitProcessInBand<Relic>(process: ProcessRef<Relic>): Wisp<Relic> {
  return pipe(
    wait(process.exitFuture),
    wisp.liftF,
    wisp.map(narrowAs<either.Right<Relic>>()),
    wisp.map(({ right }) => right),
  );
}
