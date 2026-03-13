import type { FutureKey, Ritual, Wisp } from "#src/contracts";
import { flow, pipe } from "fp-ts/function";
import { awaitProcessInBand } from "#src/primitives-kit";
import { narrowArrayAs } from "#src/utils";
import { readonlyArray } from "fp-ts";
import { spawn } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export function all<BranchReturns extends readonly unknown[]>(
  branches: AllBranches<BranchReturns>,
): Wisp<FutureKey<BranchReturns>> {
  return pipe(
    spawn(allAggregator(branches)),
    wisp.liftF,
    wisp.map((processRef) => processRef.exitFuture),
  );
}

type AllBranches<BranchReturns extends readonly unknown[]> = {
  readonly [Index in keyof BranchReturns]: Ritual<BranchReturns[Index]>;
};

function allAggregator<BranchReturns extends readonly unknown[]>(
  branches: AllBranches<BranchReturns>,
) {
  return () =>
    pipe(
      branches,
      readonlyArray.map(flow(spawn, wisp.liftF)),
      wisp.sequence,
      wisp.map(readonlyArray.map(awaitProcessInBand)),
      wisp.chain(wisp.sequence),
      wisp.map(narrowArrayAs<BranchReturns>()),
    );
}
