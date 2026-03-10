import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { Failure, FutureKey, FutureSettleKey, Ritual, Wisp } from "#src/contracts";
import { either, readonlyArray } from "fp-ts";
import { fork, future, halt, settle, spawn } from "#src/sigils";
import { forkFutureInto, park } from "#src/primitives-kit";
import type { Either } from "#src/utils";
import { pipe } from "fp-ts/function";
import { restingWisp } from "#src/contracts";
import { supervisorScopeSpec } from "#src/scopes";
import { wisp } from "#src/internal/fp";

export function race<BranchReturns extends NonEmptyTuple<unknown>>(
  branches: RaceBranches<BranchReturns>,
): Wisp<FutureKey<Either<Failure, ArrayValues<BranchReturns>>>> {
  return pipe(
    wisp.Do,
    wisp.bindF("raceFuture", () => future<Either<Failure, ArrayValues<BranchReturns>>>()),
    wisp.bindF("arenaSelf", ({ raceFuture: [, raceSettleKey] }) =>
      spawn(raceArena(branches, raceSettleKey), supervisorScopeSpec()),
    ),
    wisp.chainFirst(({ arenaSelf: { scopeRef: arenaRef }, raceFuture: [, raceSettleKey] }) =>
      forkFutureInto(arenaRef.exitFuture, raceSettleKey, restingWisp),
    ),
    wisp.map(({ raceFuture: [raceFutureKey] }) => raceFutureKey),
  );
}

type RaceBranches<BranchReturns extends NonEmptyTuple<unknown>> = {
  readonly [Index in keyof BranchReturns]: Ritual<BranchReturns[Index]>;
};

function raceArena(
  branches: ReadonlyArray<Ritual<unknown>>,
  raceSettleKey: FutureSettleKey<Either<Failure, unknown>>,
): Ritual<never> {
  return () =>
    pipe(
      branches,
      readonlyArray.map((branch) => pipe(fork(branchRunner(branch, raceSettleKey)), wisp.liftF)),
      wisp.sequence,
      wisp.chain(() => park()),
    );
}

function branchRunner(
  branch: Ritual<unknown>,
  raceSettleKey: FutureSettleKey<Either<Failure, unknown>>,
): Ritual<never> {
  return () =>
    pipe(
      branch(),
      wisp.chainF((value) => settle(raceSettleKey, either.right(value))),
      wisp.chainF(() => halt()),
    );
}
