import type { FutureKey, Ritual, Wisp } from "#src/contracts";
import { flow, pipe } from "fp-ts/function";
import { awaitProcessInBand } from "#src/primitives-kit";
import { fork } from "#src/sigils";
import { narrowArrayAs } from "#src/utils";
import { readonlyArray } from "fp-ts";
import { wisp } from "#src/internal/fp";

export function all<BranchReturns extends readonly unknown[]>(
  branches: AllBranches<BranchReturns>,
): Wisp<FutureKey<BranchReturns>> {
  return pipe(
    fork(allAggregator(branches)),
    wisp.liftF,
    wisp.map((processRef) => processRef.exitFuture),
  );
}

function allAggregator<BranchReturns extends readonly unknown[]>(
  branches: AllBranches<BranchReturns>,
): Ritual<BranchReturns> {
  return () =>
    pipe(
      branches,
      readonlyArray.map(flow(fork, wisp.liftF)),
      wisp.sequence,
      wisp.map(readonlyArray.map(awaitProcessInBand)),
      wisp.chain(wisp.sequence),
      wisp.map(narrowArrayAs<BranchReturns>()),
    );
}

type AllBranches<BranchReturns extends readonly unknown[]> = {
  readonly [Index in keyof BranchReturns]: Ritual<BranchReturns[Index]>;
};
