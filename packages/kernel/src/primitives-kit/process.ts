import type { FutureKey, ProcessRef, Ritual, Wisp } from "#/contracts";
import { branch, halt, spawn, wait } from "#/sigils";
import { flow, pipe } from "fp-ts/function";
import { wisp, wispEither } from "#/internal/fp";
import type { either } from "fp-ts";
import { narrowAs } from "#/utils";

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

export function resolvePrimary<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    branch(entry, { failureMode: "contain" }),
    wisp.liftF,
    wisp.chainFirstF(({ scope }) => spawn(propagateFailure(scope.exitFuture))),
    wisp.map(({ process }) => process.exitFuture),
  );
}

function propagateFailure(boundaryFuture: FutureKey<unknown>) {
  return () => pipe(wait(boundaryFuture), wisp.liftF, wispEither.orElse(flow(halt, wisp.liftF)));
}
