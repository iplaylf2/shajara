import type { FutureKey, FutureSettleKey, Ritual, Wisp } from "#/contracts/index.js";
import type { ScopeExitFailure } from "#/failures/index.js";
import type { ScopedOutcome } from "./branch.js";
import { branch } from "./branch.js";
import { either } from "fp-ts";
import { future } from "./future.js";
import { pipe } from "fp-ts/function";
import { requestRecovery } from "#/primitives-kit/index.js";
import { settle } from "./settle.js";
import { spawn } from "./spawn.js";
import { wait } from "./wait.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Opens a child scope whose scope-exit failure is offered to recovery routes.
 *
 * @returns Child scope and recovery outcome future.
 */
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
