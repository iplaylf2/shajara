import type { FailureShape, FutureKey, Ritual, Wisp } from "#/contracts";
import { branch, future, halt, lookup, send, spawn, wait } from "#/sigils/index";
import { flow, pipe } from "fp-ts/function";
import { wisp, wispEither } from "#/internal/fp";
import type { ScopeFailure } from "#/failures";
import { either } from "fp-ts";
import { recoveryChannelKey } from "#/primitives-kit";

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
          lookup(recoveryChannelKey),
          wisp.liftF,
          wisp.map(either.fromOption(() => failure)),
          wispEither.map((recoveryChannel) => ({ recoveryChannel })),
          wispEither.bindF("resolver", () => future<Relic>()),
          wispEither.chainFirstF(({ resolver: [, recoverySettle], recoveryChannel }) =>
            send(recoveryChannel, {
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
