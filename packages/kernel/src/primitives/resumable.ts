import type { FutureKey, FutureSettleKey, Ritual, Wisp } from "#/contracts";
import type { ScopeExitFailure } from "#/failures";
import type { ScopedOutcome } from "./branch";
import { branch } from "./branch";
import { either } from "fp-ts";
import { future } from "./future";
import { pipe } from "fp-ts/function";
import { requestRecovery } from "#/primitives-kit";
import { settle } from "./settle";
import { spawn } from "./spawn";
import { wait } from "./wait";
import { wisp } from "#/internal/fp";

export function resumable<Relic>(entry: Ritual<Relic>): Wisp<ScopedOutcome<Relic>> {
  return pipe(
    wisp.Do,
    wisp.bind("outcome", () => future<Relic>()),
    wisp.bind("scope", () =>
      pipe(
        branch(entry),
        wisp.map(({ scope }) => scope),
      ),
    ),
    wisp.chainFirst(({ outcome: [, outcomeSettle], scope }) =>
      spawn(resumableOutcome(scope.exitFuture, outcomeSettle)),
    ),
    wisp.map(({ outcome: [outcomeFuture], scope }) => [scope, outcomeFuture] as const),
  );
}

function resumableOutcome<Relic>(
  scopeExit: FutureKey<Relic>,
  outcomeSettle: FutureSettleKey<Relic>,
) {
  return () =>
    pipe(
      wait(scopeExit),
      wisp.chain(
        either.match(
          (failure) =>
            pipe(
              requestRecovery<Relic>(failure as ScopeExitFailure),
              wisp.chain((recovery) => settle(outcomeSettle, recovery)),
            ),
          (value) => settle(outcomeSettle, either.right(value)),
        ),
      ),
    );
}
