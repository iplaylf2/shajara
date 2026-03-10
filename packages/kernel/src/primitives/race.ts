import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { Failure, FutureKey, FutureResolverKey, Ritual, Wisp } from "#src/contracts";
import { either, readonlyArray } from "fp-ts";
import { fork, future, halt, settleFuture, spawn } from "#src/sigils";
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
    wisp.bindF("arenaSelf", ({ raceFuture: [, raceResolverKey] }) =>
      spawn(raceArena(branches, raceResolverKey), supervisorScopeSpec()),
    ),
    wisp.chainFirst(({ arenaSelf: { scopeRef: arenaRef }, raceFuture: [, raceResolverKey] }) =>
      forkFutureInto(arenaRef.exitFuture, raceResolverKey, restingWisp),
    ),
    wisp.map(({ raceFuture: [raceFutureKey] }) => raceFutureKey),
  );
}

type RaceBranches<BranchReturns extends NonEmptyTuple<unknown>> = {
  readonly [Index in keyof BranchReturns]: Ritual<BranchReturns[Index]>;
};

function raceArena(
  branches: ReadonlyArray<Ritual<unknown>>,
  raceResolverKey: FutureResolverKey<Either<Failure, unknown>>,
): Ritual<never> {
  return () =>
    pipe(
      branches,
      readonlyArray.map((branch) => pipe(fork(branchRunner(branch, raceResolverKey)), wisp.liftF)),
      wisp.sequence,
      wisp.chain(() => park()),
    );
}

function branchRunner(
  branch: Ritual<unknown>,
  raceResolverKey: FutureResolverKey<Either<Failure, unknown>>,
): Ritual<never> {
  return () =>
    pipe(
      branch(),
      wisp.chainF((value) => settleFuture(raceResolverKey, either.right(value))),
      wisp.chainF(() => halt()),
    );
}
