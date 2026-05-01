import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { FutureKey, FutureSettleKey, Ritual, Wisp } from "#/contracts";
import { either, readonlyArray } from "fp-ts";
import { branch } from "./branch";
import { cancel } from "./cancel";
import { future } from "./future";
import { pipe } from "fp-ts/function";
import { settle } from "./settle";
import { spawn } from "./spawn";
import { wisp } from "#/internal/fp";

export function race<EntryReturns extends NonEmptyTuple<unknown>>(
  entries: RaceEntries<EntryReturns>,
): Wisp<FutureKey<ArrayValues<EntryReturns>>> {
  return pipe(
    future<ArrayValues<EntryReturns>>(),
    wisp.chainFirst(([, winnerSettle]) => branch(raceArena(entries, winnerSettle))),
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
      readonlyArray.map((entry) => spawn(raceEntrant(entry, winnerSettle))),
      wisp.sequence,
    );
}

function raceEntrant(entry: Ritual<unknown>, winnerSettle: FutureSettleKey<unknown>) {
  return () =>
    pipe(
      entry(),
      wisp.chain((value) => settle(winnerSettle, either.right(value))),
      wisp.chain(cancel),
    );
}
