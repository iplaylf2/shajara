import type { FutureKey, FutureSettleKey, Ritual, Wisp } from "#/contracts/index.js";
import { either, readonlyArray } from "fp-ts";
import type { ScopedOutcome } from "./branch.js";
import { branch } from "./branch.js";
import { cancel } from "./cancel.js";
import { future } from "./future.js";
import { noop } from "#/utils/index.js";
import { pipe } from "fp-ts/function";
import { settle } from "./settle.js";
import { spawn } from "./spawn.js";
import { wait } from "./wait.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Runs ritual entries in a race scope and cancels losing work after the first success.
 * If the race scope fails before a winner, the outcome future carries that failure.
 *
 * @returns Race scope and winner future.
 */
export function race<EntryReturns extends readonly [unknown, ...unknown[]]>(
  entries: RaceEntries<EntryReturns>,
): Wisp<ScopedOutcome<EntryReturns[number]>> {
  return pipe(
    wisp.Do,
    wisp.bind("winner", () => future<EntryReturns[number]>()),
    wisp.bind("scope", ({ winner: [, winnerSettle] }) =>
      pipe(
        branch(raceArena(entries, winnerSettle)),
        wisp.map(({ scope }) => scope),
      ),
    ),
    wisp.chainFirst(({ scope, winner: [, winnerSettle] }) =>
      spawn(raceScopeObserver(scope.exitFuture, winnerSettle)),
    ),
    wisp.map(({ scope, winner: [winnerFuture] }) => [scope, winnerFuture] as const),
  );
}

/** Ritual entries whose relics form the race winner type. */
export type RaceEntries<EntryReturns extends readonly [unknown, ...unknown[]]> = {
  readonly [Index in keyof EntryReturns]: Ritual<EntryReturns[Index]>;
};

function raceArena<Relic>(
  entries: readonly Ritual<Relic>[],
  winnerSettle: FutureSettleKey<Relic>,
): Ritual<void> {
  return () =>
    pipe(
      entries,
      readonlyArray.map((entry) => spawn(raceEntrant(entry, winnerSettle))),
      wisp.sequence,
      wisp.map(noop),
    );
}

function raceEntrant<Relic>(entry: Ritual<Relic>, winnerSettle: FutureSettleKey<Relic>) {
  return () =>
    pipe(
      entry(),
      wisp.chain((value) => settle(winnerSettle, either.right(value))),
      wisp.chain(cancel),
    );
}

function raceScopeObserver<Relic>(
  scopeExit: FutureKey<void>,
  winnerSettle: FutureSettleKey<Relic>,
) {
  return () =>
    pipe(
      wait(scopeExit),
      wisp.chain(
        either.match(
          (failure) => settle(winnerSettle, either.left(failure)),
          () => wisp.fromIO(noop),
        ),
      ),
    );
}
