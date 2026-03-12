import type { Failure, FutureKey, Ritual, Wisp } from "#src/contracts";
import { flow, pipe } from "fp-ts/function";
import { fork, future, halt, lookup, send, spawn, wait } from "#src/sigils";
import { resumableDelegateKey, resumableFailureKey } from "#src/primitives-kit";
import { wisp, wispEither } from "#src/internal/fp";
import { either } from "fp-ts";
import { supervisorScopeSpec } from "#src/scopes";

export function resumable<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    spawn(entry, supervisorScopeSpec()),
    wisp.liftF,
    wisp.chainFirstF(({ scopeRef }) => fork(propagateFailure(scopeRef.exitFuture))),
    wisp.chainF(({ processRef }) => fork(resolveEntry(processRef.exitFuture))),
    wisp.map(({ exitFuture }) => exitFuture),
  );
}

function propagateFailure(boundaryFuture: FutureKey<unknown>) {
  return () => pipe(wait(boundaryFuture), wisp.liftF, wispEither.orElse(flow(halt, wisp.liftF)));
}

function resolveEntry<Relic>(entryFuture: FutureKey<Relic>) {
  return () =>
    pipe(
      wait(entryFuture),
      wisp.liftF,
      wispEither.orElse((failure) =>
        pipe(
          lookup(resumableDelegateKey),
          wisp.liftF,
          wisp.map(either.fromOption(() => failure)),
          wispEither.map((delegateScopeRef) => ({ delegateScopeRef })),
          wispEither.bindF("resolver", () => future<Relic>()),
          wispEither.chainFirstF(({ resolver: [, recoverySettle], delegateScopeRef }) =>
            send(delegateScopeRef, resumableFailureKey, {
              failure,
              recoverySettle,
            }),
          ),
          wispEither.chainF(({ resolver: [recoveryFuture] }) => wait(recoveryFuture)),
          wisp.map(either.flatten),
        ),
      ),
      wispEither.getOrElse<Failure, Relic>(flow(halt, wisp.liftF)),
    );
}
