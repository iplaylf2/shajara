import type { FutureKey, Ritual, Wisp } from "#/contracts/index.js";
import { narrowArrayAs, narrowAs } from "#/utils/index.js";
import type { Right } from "#/utils/index.js";
import { pipe } from "fp-ts/function";
import { readonlyArray } from "fp-ts";
import { spawn } from "./spawn.js";
import { wait } from "./wait.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Starts ritual entries concurrently in the current scope and returns without waiting.
 *
 * @returns Future whose successful value preserves entry order.
 */
export function all<EntryReturns extends readonly unknown[]>(
  entries: AllEntries<EntryReturns>,
): Wisp<FutureKey<EntryReturns>> {
  return spawn(allAggregator(entries));
}

/** Ritual entries whose relics form the aggregate result tuple. */
export type AllEntries<EntryReturns extends readonly unknown[]> = {
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
    wisp.map(narrowAs<Right<Relic>>()),
    wisp.map(({ right }) => right),
  );
}
