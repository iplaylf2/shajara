import type { FutureKey, Ritual, Wisp } from "#/contracts";
import { flow, pipe } from "fp-ts/function";
import { awaitProcessInBand } from "#/primitives-kit";
import { narrowArrayAs } from "#/utils/index";
import { readonlyArray } from "fp-ts";
import { spawn } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function all<BranchReturns extends readonly unknown[]>(
  branches: AllBranches<BranchReturns>,
): Wisp<FutureKey<BranchReturns>> {
  return pipe(
    spawn(allAggregator(branches)),
    wisp.liftF,
    wisp.map((process) => process.exitFuture),
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
