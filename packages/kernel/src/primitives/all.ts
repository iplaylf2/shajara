import type { AwaitScopeExit, SpawnDescriptor, SpawnRef } from "#src/syscalls";
import type { Blueprint, Plan } from "#src/contracts/plan";
import { awaitScope, spawn } from "#src/syscalls";
import { flow, pipe } from "fp-ts/lib/function";
import { left, right } from "fp-ts/Either";
import type { Either } from "fp-ts/Either";
import type { UnknownArray } from "type-fest";
import { plan } from "#src/internal/fp/plan";
import { readonlyArray } from "fp-ts";

type AllBranches<BranchReturnValues extends UnknownArray> = {
  readonly [Index in keyof BranchReturnValues]: Blueprint<BranchReturnValues[Index]>;
};

export function all<BranchReturnValues extends UnknownArray>(
  branches: AllBranches<BranchReturnValues>,
): Plan<Either<unknown, BranchReturnValues>> {
  return pipe(
    spawn(() => executeAllInCoordinatorScope(branches)),
    plan.liftF,
    plan.chain(awaitCompletedSpawn<Either<unknown, readonly unknown[]>>),
    plan.map(
      (coordinatorExit) =>
        mergeCoordinatorExit(coordinatorExit) as Either<unknown, BranchReturnValues>,
    ),
  );
}

function executeAllInCoordinatorScope(
  branches: readonly Blueprint<unknown>[],
): Plan<Either<unknown, readonly unknown[]>> {
  return pipe(
    branches,
    readonlyArray.map(flow(spawn, plan.liftF)),
    plan.sequence,
    plan.chain(flow(readonlyArray.map(awaitCompletedSpawn), plan.sequence)),
    plan.map((branchExits) => collectBranchExits(branchExits)),
  );
}

function awaitCompletedSpawn<ReturnValue>(
  spawned: SpawnDescriptor<ReturnValue, SpawnRef<ReturnValue>>,
): Plan<AwaitScopeExit<ReturnValue>> {
  return pipe(awaitScope<ReturnValue>(spawned.scopeRef), plan.liftF);
}

function collectBranchExits(
  exits: readonly AwaitScopeExit<unknown>[],
): Either<unknown, readonly unknown[]> {
  const values: unknown[] = [];

  for (const exit of exits) {
    if (exit.kind === "completed") {
      values.push(exit.value);
    } else {
      return scopeExitToFailure(exit);
    }
  }

  return right(values);
}

function mergeCoordinatorExit(
  coordinatorExit: AwaitScopeExit<Either<unknown, readonly unknown[]>>,
): Either<unknown, readonly unknown[]> {
  if (coordinatorExit.kind === "completed") {
    return coordinatorExit.value;
  }
  return scopeExitToFailure(coordinatorExit);
}

function scopeExitToFailure(
  exit: Exclude<AwaitScopeExit<unknown>, { readonly kind: "completed" }>,
): Either<unknown, never> {
  if (exit.kind === "failed") {
    return left<unknown, never>(exit.fault);
  }
  return left<unknown, never>(new Error("kernel primitive 'all' observed a non-completed branch"));
}
