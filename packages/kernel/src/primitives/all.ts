import type { AwaitScopeExit, SpawnDescriptor, SpawnRef } from "#src/syscalls";
import type { Blueprint, Plan } from "#src/contracts/plan";
import { awaitScope, halt, spawn } from "#src/syscalls";
import { flow, pipe } from "fp-ts/lib/function";
import type { UnknownArray } from "type-fest";
import { plan } from "#src/internal/fp/plan";
import { readonlyArray } from "fp-ts";

type AllBranches<BranchReturnValues extends UnknownArray> = {
  readonly [Index in keyof BranchReturnValues]: Blueprint<BranchReturnValues[Index]>;
};

export function all<BranchReturnValues extends UnknownArray>(
  branches: AllBranches<BranchReturnValues>,
): Plan<BranchReturnValues> {
  return pipe(
    spawn(() => executeAllInCoordinatorScope(branches)),
    plan.liftF,
    plan.chain(awaitCompletedSpawn<readonly unknown[]>),
  ) as Plan<BranchReturnValues>;
}

function executeAllInCoordinatorScope(
  branches: readonly Blueprint<unknown>[],
): Plan<readonly unknown[]> {
  return pipe(
    branches,
    readonlyArray.map(flow(spawn, plan.liftF)),
    plan.sequence,
    plan.chain(flow(readonlyArray.map(awaitCompletedSpawn), plan.sequence)),
  );
}

function awaitCompletedSpawn<ReturnValue>(
  spawned: SpawnDescriptor<ReturnValue, SpawnRef<ReturnValue>>,
): Plan<ReturnValue> {
  return pipe(
    awaitScope<ReturnValue>(spawned.scopeRef),
    plan.liftF,
    plan.chain((scopeExit) => scopeExitToPlan(scopeExit)),
  );
}

function scopeExitToPlan<ReturnValue>(scopeExit: AwaitScopeExit<ReturnValue>): Plan<ReturnValue> {
  if (scopeExit.kind === "completed") {
    return plan.pure(scopeExit.value);
  }
  if (scopeExit.kind === "failed") {
    return plan.liftF(halt(scopeExit.fault));
  }
  return plan.liftF(halt(new Error("kernel primitive 'all' observed a terminated branch scope.")));
}
