import type { FutureKey, Ritual, Wisp } from "#/contracts";
import { narrowArrayAs, narrowAs } from "#/utils/index";
import type { either } from "fp-ts";
import { pipe } from "fp-ts/function";
import { readonlyArray } from "fp-ts";
import { spawn } from "./spawn";
import { wait } from "./wait";
import { wisp } from "#/internal/fp";

/**
 * Runs entries concurrently in the current scope.
 *
 * @returns Future whose successful result preserves entry order.
 */
export function all<EntryReturns extends readonly unknown[]>(
  entries: AllEntries<EntryReturns>,
): Wisp<FutureKey<EntryReturns>> {
  return spawn(allAggregator(entries));
}

type AllEntries<EntryReturns extends readonly unknown[]> = {
  readonly [Index in keyof EntryReturns]: Ritual<EntryReturns[Index]>;
};

function allAggregator<EntryReturns extends readonly unknown[]>(entries: AllEntries<EntryReturns>) {
  return () =>
    pipe(
      entries,
      readonlyArray.map(spawn),
      wisp.sequence,
      wisp.map(readonlyArray.map(awaitFutureInBand)),
      wisp.chain(wisp.sequence),
      wisp.map(narrowArrayAs<EntryReturns>()),
    );
}

function awaitFutureInBand<Relic>(future: FutureKey<Relic>): Wisp<Relic> {
  return pipe(
    wait(future),
    wisp.map(narrowAs<either.Right<Relic>>()),
    wisp.map(({ right }) => right),
  );
}
