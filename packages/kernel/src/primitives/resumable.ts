import type { Failure, FutureKey, Ritual, Wisp } from "#src/contracts";
import { flow, pipe } from "fp-ts/function";
import { fork, future, halt, lookup, send, wait } from "#src/sigils";
import { resolvePrimary, resumableDelegateKey, resumableFailureKey } from "#src/primitives-kit";
import { wisp, wispEither } from "#src/internal/fp";
import { either } from "fp-ts";

export function resumable<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    resolvePrimary(entry),
    wisp.chainF((entryFuture) => fork(tryResume(entryFuture))),
    wisp.map(({ exitFuture }) => exitFuture),
  );
}

function tryResume<Relic>(entryFuture: FutureKey<Relic>) {
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
