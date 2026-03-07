import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { Ritual, Channel, Failure, Wisp, ScopeRef } from "#src/contracts";
import { awaitScopeConverged, park } from "#src/primitives-kit";
import { either, readonlyArray } from "fp-ts";
import { fork, halt, receive, self, send, spawn } from "#src/syscalls";
import type { Either } from "#src/utils";
import { channel } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { supervisorScopeSpec } from "#src/scopes";

export function race<BranchReturns extends NonEmptyTuple<unknown>>(
  branches: RaceBranches<BranchReturns>,
): Wisp<Either<Failure, ArrayValues<BranchReturns>>> {
  const raceChannel = channel<Either<Failure, ArrayValues<BranchReturns>>>();

  return pipe(
    plan.Do,
    plan.bindF("callerSelf", self),
    plan.bindF("arenaSelf", ({ callerSelf: { scopeRef: callerRef } }) =>
      spawn(raceArena(branches, callerRef, raceChannel), supervisorScopeSpec()),
    ),
    plan.chainF(({ arenaSelf: { scopeRef: arenaRef }, callerSelf: { scopeRef: callerRef } }) =>
      fork(arenaFailureRelay(arenaRef, callerRef, raceChannel)),
    ),
    plan.chainF(() => receive(raceChannel)),
    plan.map(({ value }) => value),
  );
}

type RaceBranches<BranchReturns extends NonEmptyTuple<unknown>> = {
  readonly [Index in keyof BranchReturns]: Ritual<BranchReturns[Index]>;
};

function raceArena(
  branches: ReadonlyArray<Ritual<unknown>>,
  callerRef: ScopeRef<unknown>,
  raceChannel: Channel<Either<Failure, unknown>>,
): Ritual<never> {
  return () =>
    pipe(
      branches,
      readonlyArray.map((branch) =>
        pipe(fork(branchRunner(branch, callerRef, raceChannel)), plan.liftF),
      ),
      plan.sequence,
      plan.chain(() => park()),
    );
}

function arenaFailureRelay(
  arenaRef: ScopeRef<unknown>,
  callerRef: ScopeRef<unknown>,
  raceChannel: Channel<Either<Failure, unknown>>,
): Ritual<void> {
  return () =>
    pipe(
      arenaRef,
      awaitScopeConverged,
      plan.chainF((value) => send(callerRef, raceChannel, value)),
    );
}

function branchRunner(
  branch: Ritual<unknown>,
  callerRef: ScopeRef<unknown>,
  raceChannel: Channel<Either<Failure, unknown>>,
): Ritual<never> {
  return () =>
    pipe(
      branch(),
      plan.chainF((value) => send(callerRef, raceChannel, either.right(value))),
      plan.chainF(() => halt()),
    );
}
