// oxlint-disable import/max-dependencies
import type { FailureShape, FutureKey, Ritual, Wisp } from "#/contracts";
import { wisp, wispEither } from "#/internal/fp";
import type { ScopeFailure } from "#/failures";
import { branch } from "./branch";
import { either } from "fp-ts";
import { future } from "./future";
import { halt } from "./halt";
import { lookup } from "./lookup";
import { pipe } from "fp-ts/function";
import { recoveryChannelKey } from "#/primitives-kit";
import { send } from "./send";
import { spawn } from "./spawn";
import { wait } from "./wait";

export function resumable<Relic>(entry: Ritual<Relic>): Wisp<FutureKey<Relic>> {
  return pipe(
    branch(entry, { failureMode: "contain" }),
    wisp.chain(({ scope }) => spawn(resumeAttempt(scope.exitFuture))),
  );
}

function resumeAttempt<Relic>(entryFuture: FutureKey<Relic>) {
  return () =>
    pipe(
      wait(entryFuture),
      wispEither.orElse((failure) =>
        pipe(
          lookup(recoveryChannelKey),
          wisp.map(either.fromOption(() => failure)),
          wispEither.map((recoveryChannel) => ({ recoveryChannel })),
          wispEither.bind("resolver", () => wispEither.rightWisp(future<Relic>())),
          wispEither.chainFirst(({ resolver: [, recoverySettle], recoveryChannel }) =>
            wispEither.rightWisp(
              send(recoveryChannel, {
                failure: failure as ScopeFailure,
                recoverySettle,
              }),
            ),
          ),
          wispEither.chain(({ resolver: [recoveryFuture] }) => wait(recoveryFuture)),
        ),
      ),
      wispEither.getOrElse<FailureShape, Relic>(halt),
    );
}
