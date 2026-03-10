import type { Failure, FutureKey, FutureSettleKey, Ritual, ScopeRef, Wisp } from "#src/contracts";
import { fork, future, lookup, send, settle, spawn, wait } from "#src/sigils";
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
        wisp.chainFirstF(([, resultSettleKey]) => fork(resumableRelay(scopeRef, resultSettleKey))),
        wisp.map(([resultFutureKey]) => resultFutureKey),
      ),
    ),
  );
}

function resumableRelay<Relic>(
  supervisorRef: ScopeRef<Relic>,
  recoverySettleKey: FutureSettleKey<Either<Failure, Relic>>,
): Ritual<void> {
  return () =>
    pipe(
      wait(supervisorRef.exitFuture),
      wisp.liftF,
      wispEither.matchE(
        (failure) =>
          pipe(
            lookup(resumableDelegateKey),
            wisp.liftF,
            wispOption.matchE(
              () => pipe(settle(recoverySettleKey, either.left(failure)), wisp.liftF),
              (delegateScopeRef) =>
                pipe(
                  send(delegateScopeRef, resumableFailureMessageKey, {
                    failure,
                    recoverySettleKey,
                  }),
                  wisp.liftF,
                ),
            ),
          ),
        (value) => pipe(settle(recoverySettleKey, either.right(value)), wisp.liftF),
      ),
    );
}
