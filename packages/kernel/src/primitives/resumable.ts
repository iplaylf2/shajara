import type { FailureShape, FutureKey, Ritual, Wisp } from "#/contracts";
import { flow, pipe } from "fp-ts/function";
import { future, halt, lookup, send, spawn, wait } from "#/sigils";
import { resolvePrimary, resumableDelegateKey, resumableFailureKey } from "#/primitives-kit";
import { wisp, wispEither } from "#/internal/fp";
import { either } from "fp-ts";

export function resumable<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    resolvePrimary(entry),
    wisp.chainF((entryFuture) => spawn(resumeAttempt(entryFuture))),
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
              failure,
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
