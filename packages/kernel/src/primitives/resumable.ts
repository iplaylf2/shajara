import type { FailureShape, FutureKey, Ritual, Wisp } from "#/contracts";
import { branch, future, halt, lookup, send, spawn, wait } from "#/sigils";
import { flow, pipe } from "fp-ts/function";
import { resumableDelegateKey, resumableFailureKey } from "#/primitives-kit";
import { wisp, wispEither } from "#/internal/fp";
import type { ScopeFailure } from "#/failures";
import { either } from "fp-ts";

export function resumable<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    branch(entry, { failureMode: "contain" }),
    wisp.liftF,
    wisp.chainF(({ scope }) => spawn(resumeAttempt(scope.exitFuture))),
    wisp.map(({ exitFuture }) => exitFuture),
  );
}

function resumeAttempt<Relic>(entryFuture: FutureKey<Relic>) {
  return () =>
    pipe(
      wait(entryFuture),
      wisp.liftF,
      wispEither.orElse((failure) =>
        pipe(
          lookup(resumableDelegateKey),
          wisp.liftF,
          wisp.map(either.fromOption(() => failure)),
          wispEither.map((delegateScope) => ({ delegateScope })),
          wispEither.bindF("resolver", () => future<Relic>()),
          wispEither.chainFirstF(({ resolver: [, recoverySettle], delegateScope }) =>
            send(delegateScope, resumableFailureKey, {
              failure: failure as ScopeFailure,
              recoverySettle,
            }),
          ),
          wispEither.chainF(({ resolver: [recoveryFuture] }) => wait(recoveryFuture)),
          wisp.map(either.flatten),
        ),
      ),
      wispEither.getOrElse<FailureShape, Relic>(flow(halt, wisp.liftF)),
    );
}
