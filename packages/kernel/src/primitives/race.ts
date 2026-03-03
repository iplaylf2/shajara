import type { ArrayValues, UnknownArray } from "type-fest";
import type { Blueprint, Channel, Failure, Plan, ScopeRef } from "#src/contracts";
import { either, readonlyArray } from "fp-ts";
import { fork, halt, receive, self, send, spawn } from "#src/syscalls";
import type { Either } from "#src/utils";
import { awaitScopeConverged } from "#src/primitives-kit";
import { channel } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { supervisorScopeSpec } from "#src/scopes";

export function race<BranchReturns extends UnknownArray>(
  branches: RaceBranches<BranchReturns>,
): Plan<Either<Failure, ArrayValues<BranchReturns>>> {
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

type RaceBranches<BranchReturns extends UnknownArray> = {
  readonly [Index in keyof BranchReturns]: Blueprint<BranchReturns[Index]>;
};

function raceArena(
  branches: ReadonlyArray<Blueprint<unknown>>,
  callerRef: ScopeRef<unknown>,
  raceChannel: Channel<Either<Failure, unknown>>,
): Blueprint<never> {
  return () =>
    pipe(
      self(),
      plan.liftF,
      plan.chain(({ scopeRef: arenaRef }) =>
        pipe(
          branches,
          readonlyArray.map((branch) =>
            pipe(spawn(branchRunner(branch, callerRef, arenaRef, raceChannel)), plan.liftF),
          ),
          plan.sequence,
        ),
      ),
      plan.chainF(() => receive(haltChannel)),
      plan.chainF(() => halt()),
    );
}

function arenaFailureRelay(
  arenaRef: ScopeRef<unknown>,
  callerRef: ScopeRef<unknown>,
  raceChannel: Channel<Either<Failure, unknown>>,
): Blueprint<void> {
  return () =>
    pipe(
      arenaRef,
      awaitScopeConverged,
      plan.chainF((value) => send(callerRef, raceChannel, value)),
    );
}

function branchRunner(
  branch: Blueprint<unknown>,
  callerRef: ScopeRef<unknown>,
  arenaRef: ScopeRef<unknown>,
  raceChannel: Channel<Either<Failure, unknown>>,
): Blueprint<void> {
  return () =>
    pipe(
      branch(),
      plan.chainF((value) => send(callerRef, raceChannel, either.right(value))),
      plan.chainF(() => send(arenaRef, haltChannel, null)),
    );
}

const haltChannel = channel<null>();
