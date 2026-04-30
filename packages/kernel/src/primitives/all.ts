import type { FutureKey, Ritual, Wisp } from "#/contracts";
import { flow, pipe } from "fp-ts/function";
import { awaitProcessInBand } from "#/primitives-kit";
import { narrowArrayAs } from "#/utils/index";
import { readonlyArray } from "fp-ts";
import { spawn } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function all<EntryReturns extends readonly unknown[]>(
  entries: AllEntries<EntryReturns>,
): Wisp<FutureKey<EntryReturns>> {
  return pipe(
    spawn(allAggregator(entries)),
    wisp.liftF,
    wisp.map((process) => process.exitFuture),
  );
}

type AllEntries<EntryReturns extends readonly unknown[]> = {
  readonly [Index in keyof EntryReturns]: Ritual<EntryReturns[Index]>;
};

function allAggregator<EntryReturns extends readonly unknown[]>(entries: AllEntries<EntryReturns>) {
  return () =>
    pipe(
      entries,
      readonlyArray.map(flow(spawn, wisp.liftF)),
      wisp.sequence,
      wisp.map(readonlyArray.map(awaitProcessInBand)),
      wisp.chain(wisp.sequence),
      wisp.map(narrowArrayAs<EntryReturns>()),
    );
}
