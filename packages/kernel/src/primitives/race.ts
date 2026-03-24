import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { FutureKey, FutureSettleKey, Ritual, Wisp } from "#/contracts";
import { branch, cancel, future, settle, spawn } from "#/sigils";
import { either, readonlyArray } from "fp-ts";
import { pipe } from "fp-ts/function";
import { wisp } from "#/internal/fp";

export function race<BranchReturns extends NonEmptyTuple<unknown>>(
  branches: RaceBranches<BranchReturns>,
): Wisp<FutureKey<ArrayValues<BranchReturns>>> {
  return pipe(
    future<ArrayValues<BranchReturns>>(),
    wisp.liftF,
    wisp.chainFirstF(([, winnerSettle]) => branch(raceArena(branches, winnerSettle))),
    wisp.map(([winnerFuture]) => winnerFuture),
  );
}

type RaceBranches<BranchReturns extends NonEmptyTuple<unknown>> = {
  readonly [Index in keyof BranchReturns]: Ritual<BranchReturns[Index]>;
};

function raceArena(
  branches: ReadonlyArray<Ritual<unknown>>,
  winnerSettle: FutureSettleKey<unknown>,
) {
  return () =>
    pipe(
      branches,
      readonlyArray.map((ritual) => pipe(spawn(runBranch(ritual, winnerSettle)), wisp.liftF)),
      wisp.sequence,
    );
}

function runBranch(ritual: Ritual<unknown>, winnerSettle: FutureSettleKey<unknown>) {
  return () =>
    pipe(
      ritual(),
      wisp.chainF((value) => settle(winnerSettle, either.right(value))),
      wisp.chainF(cancel),
    );
}
