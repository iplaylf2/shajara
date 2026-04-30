import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { FutureKey, FutureSettleKey, Ritual, Wisp } from "#/contracts";
import { branch, cancel, future, settle, spawn } from "#/sigils/index";
import { either, readonlyArray } from "fp-ts";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

export function race<EntryReturns extends NonEmptyTuple<unknown>>(
  entries: RaceEntries<EntryReturns>,
): Wisp<FutureKey<ArrayValues<EntryReturns>>> {
  return pipe(
    future<ArrayValues<EntryReturns>>(),
    wisp.liftF,
    wisp.chainFirstF(([, winnerSettle]) => branch(raceArena(entries, winnerSettle))),
    wisp.map(([winnerFuture]) => winnerFuture),
  );
}

type RaceEntries<EntryReturns extends NonEmptyTuple<unknown>> = {
  readonly [Index in keyof EntryReturns]: Ritual<EntryReturns[Index]>;
};

function raceArena(entries: readonly Ritual<unknown>[], winnerSettle: FutureSettleKey<unknown>) {
  return () =>
    pipe(
      entries,
      readonlyArray.map((entry) => pipe(spawn(raceEntrant(entry, winnerSettle)), wisp.liftF)),
      wisp.sequence,
    );
}

function raceEntrant(entry: Ritual<unknown>, winnerSettle: FutureSettleKey<unknown>) {
  return () =>
    pipe(
      entry(),
      wisp.chainF((value) => settle(winnerSettle, either.right(value))),
      wisp.chainF(cancel),
    );
}
