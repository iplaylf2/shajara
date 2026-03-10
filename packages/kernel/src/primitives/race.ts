import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { Failure, FutureKey, FutureResolverKey, Ritual, ScopeRef, Wisp } from "#src/contracts";
import { either, readonlyArray } from "fp-ts";
import { fork, future, halt, settleFuture, spawn } from "#src/sigils";
import type { Either } from "#src/utils";
import { awaitFuture } from "#src/primitives/await-future";
import { park } from "#src/primitives-kit";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";
import { wisp } from "#src/internal/fp";

export function race<BranchReturns extends NonEmptyTuple<unknown>>(
  branches: RaceBranches<BranchReturns>,
): Wisp<FutureKey<Either<Failure, ArrayValues<BranchReturns>>>> {
  return pipe(
    wisp.Do,
    wisp.bindF("raceFuture", () => future<Either<Failure, ArrayValues<BranchReturns>>>()),
    wisp.bindF("arenaSelf", ({ raceFuture: [, raceFutureResolverKey] }) =>
      spawn(raceArena(branches, raceFutureResolverKey), supervisorScopeSpec()),
    ),
    wisp.chainFirstF(
      ({ arenaSelf: { scopeRef: arenaRef }, raceFuture: [, raceFutureResolverKey] }) =>
        fork(arenaFailureRelay(arenaRef, raceFutureResolverKey)),
    ),
    wisp.map(({ raceFuture: [raceFutureKey] }) => raceFutureKey),
  );
}

type RaceBranches<BranchReturns extends NonEmptyTuple<unknown>> = {
  readonly [Index in keyof BranchReturns]: Ritual<BranchReturns[Index]>;
};

function raceArena(
  branches: ReadonlyArray<Ritual<unknown>>,
  raceFutureResolverKey: FutureResolverKey<Either<Failure, unknown>>,
): Ritual<never> {
  return () =>
    pipe(
      branches,
      readonlyArray.map((branch) =>
        pipe(fork(branchRunner(branch, raceFutureResolverKey)), wisp.liftF),
      ),
      wisp.sequence,
      wisp.chain(() => park()),
    );
}

function arenaFailureRelay(
  arenaRef: ScopeRef<unknown>,
  raceFutureResolverKey: FutureResolverKey<Either<Failure, unknown>>,
): Ritual<void> {
  return () =>
    pipe(
      awaitFuture(arenaRef.exitFuture),
      wisp.chainF((value) => settleFuture(raceFutureResolverKey, value)),
    );
}

function branchRunner(
  branch: Ritual<unknown>,
  raceFutureResolverKey: FutureResolverKey<Either<Failure, unknown>>,
): Ritual<never> {
  return () =>
    pipe(
      branch(),
      wisp.chainF((value) => settleFuture(raceFutureResolverKey, either.right(value))),
      wisp.chainF(() => halt()),
    );
}
