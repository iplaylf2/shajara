import type { Failure, FutureKey, FutureResolverKey, Ritual, ScopeRef, Wisp } from "#src/contracts";
import { awaitFuture, fork, future, lookup, send, settleFuture, spawn } from "#src/sigils";
import { resumableDelegateKey, resumableFailureMessageKey } from "#src/primitives-kit";
import { wisp, wispEither, wispOption } from "#src/internal/fp";
import type { Either } from "#src/utils";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";

export function resumable<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Either<Failure, Relic>>> {
  return pipe(
    spawn(entry, supervisorScopeSpec()),
    wisp.liftF,
    wisp.chain(({ scopeRef }) =>
      pipe(
        future<Either<Failure, Relic>>(),
        wisp.liftF,
        wisp.chainFirstF(([, resultResolverKey]) =>
          fork(resumableRelay(scopeRef, resultResolverKey)),
        ),
        wisp.map(([resultFutureKey]) => resultFutureKey),
      ),
    ),
  );
}

function resumableRelay<Relic>(
  supervisorRef: ScopeRef<Relic>,
  recoveryKey: FutureResolverKey<Either<Failure, Relic>>,
): Ritual<void> {
  return () =>
    pipe(
      awaitFuture(supervisorRef.exitFuture),
      wisp.liftF,
      wispEither.matchE(
        (failure) =>
          pipe(
            lookup(resumableDelegateKey),
            wisp.liftF,
            wispOption.matchE(
              () => pipe(settleFuture(recoveryKey, either.left(failure)), wisp.liftF),
              (delegateScopeRef) =>
                pipe(
                  send(delegateScopeRef, resumableFailureMessageKey, {
                    failure,
                    recoveryKey,
                  }),
                  wisp.liftF,
                ),
            ),
          ),
        (value) => pipe(settleFuture(recoveryKey, either.right(value)), wisp.liftF),
      ),
    );
}
