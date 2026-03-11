import type { FutureKey, FutureSettleKey, Ritual, ScopeRef, Wisp } from "#src/contracts";
import { fork, future, lookup, send, settle, spawn, wait } from "#src/sigils";
import { resumableDelegateKey, resumableFailureMessageKey } from "#src/primitives-kit";
import { wisp, wispEither, wispOption } from "#src/internal/fp";
import { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";

export function resumable<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    spawn(entry, supervisorScopeSpec()),
    wisp.liftF,
    wisp.chain(({ scopeRef }) =>
      pipe(
        future<Relic>(),
        wisp.liftF,
        wisp.chainFirstF(([, resultSettle]) => fork(resumableRelay(scopeRef, resultSettle))),
        wisp.map(([resultFuture]) => resultFuture),
      ),
    ),
  );
}

function resumableRelay<Relic>(
  supervisorRef: ScopeRef<Relic>,
  resultSettle: FutureSettleKey<Relic>,
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
              () => pipe(settle(resultSettle, either.left(failure)), wisp.liftF),
              (delegateScopeRef) =>
                pipe(
                  send(delegateScopeRef, resumableFailureMessageKey, {
                    failure,
                    recoverySettle: resultSettle,
                  }),
                  wisp.liftF,
                ),
            ),
          ),
        (value) => pipe(settle(resultSettle, either.right(value)), wisp.liftF),
      ),
    );
}
