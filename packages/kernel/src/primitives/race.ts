import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { FutureKey, FutureSettleKey, Ritual, Wisp } from "#/contracts";
import { either, readonlyArray } from "fp-ts";
import type { BranchHandle } from "#/sigils/index";
import { branch } from "./branch";
import { cancel } from "./cancel";
import { future } from "./future";
import { pipe } from "fp-ts/function";
import { settle } from "./settle";
import { spawn } from "./spawn";
import { wisp } from "#/internal/fp";

export function race<EntryReturns extends NonEmptyTuple<unknown>>(
  entries: RaceEntries<EntryReturns>,
): Wisp<BranchHandle<FutureKey<ArrayValues<EntryReturns>>>> {
  return branch(raceArena(entries));
}

type RaceEntries<EntryReturns extends NonEmptyTuple<unknown>> = {
  readonly [Index in keyof EntryReturns]: Ritual<EntryReturns[Index]>;
};

function raceArena<Relic>(entries: readonly Ritual<Relic>[]): Ritual<FutureKey<Relic>> {
  return () =>
    pipe(
      future<Relic>(),
      wisp.chainFirst(([, winnerSettle]) =>
        pipe(
          entries,
          readonlyArray.map((entry) => spawn(raceEntrant(entry, winnerSettle))),
          wisp.sequence,
        ),
      ),
      wisp.map(([winnerFuture]) => winnerFuture),
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
