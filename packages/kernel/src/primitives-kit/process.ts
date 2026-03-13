import type { FutureKey, ProcessRef, Ritual, Wisp } from "#src/contracts";
import { branch, halt, spawn, wait } from "#src/sigils";
import { flow, pipe } from "fp-ts/function";
import { wisp, wispEither } from "#src/internal/fp";
import type { either } from "fp-ts";
import { narrowAs } from "#src/utils";
import { supervisorScopeSpec } from "#src/scopes";

/**
 * Awaits a process through the in-band completion path only.
 * Non-completed exits are treated as invalid for this helper.
 */
export function awaitProcessInBand<Relic>(processRef: ProcessRef<Relic>): Wisp<Relic> {
  return pipe(
    wait(processRef.exitFuture),
    wisp.liftF,
    wisp.map(narrowAs<either.Right<Relic>>()),
    wisp.map(({ right }) => right),
  );
}

export function resolvePrimary<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    branch(entry, supervisorScopeSpec()),
    wisp.liftF,
    wisp.chainFirstF(({ scopeRef }) => spawn(propagateFailure(scopeRef.exitFuture))),
    wisp.map(({ processRef }) => processRef.exitFuture),
  );
}

function propagateFailure(boundaryFuture: FutureKey<unknown>) {
  return () => pipe(wait(boundaryFuture), wisp.liftF, wispEither.orElse(flow(halt, wisp.liftF)));
}
