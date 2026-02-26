import type { Blueprint, Plan } from "#src/contracts/plan";
import { flow, pipe } from "fp-ts/lib/function";
import type { Either } from "fp-ts/Either";
import type { SupervisorSpawnDescriptor } from "#src/scopes";
import type { UnknownArray } from "type-fest";
import { assume } from "#src/utils/assume";
import { awaitCompletedScopeValue } from "#src/primitives-kit/await-completed-scope-value";
import { plan } from "#src/internal/fp/plan";
import { readonlyArray } from "fp-ts";
import { spawn } from "#src/syscalls";
import { supervisorScopeSpec } from "#src/scopes";

type AllBranches<BranchReturnValues extends UnknownArray> = {
  readonly [Index in keyof BranchReturnValues]: Blueprint<BranchReturnValues[Index]>;
};

export function all<BranchReturnValues extends UnknownArray>(
  branches: AllBranches<BranchReturnValues>,
): Plan<Either<unknown, BranchReturnValues>> {
  return pipe(
    spawn(
      () =>
        pipe(
          branches,
          readonlyArray.map(flow(spawn, plan.liftF)),
          plan.sequence,
          plan.map(readonlyArray.map(({ scopeRef }) => awaitCompletedScopeValue(scopeRef))),
          plan.chain(plan.sequence),
          plan.map(assume<BranchReturnValues>),
        ),
      { spec: supervisorScopeSpec() },
    ),
    plan.liftF,
    plan.map(assume<SupervisorSpawnDescriptor<BranchReturnValues>>),
    plan.chain(({ scopeRef }) => awaitCompletedScopeValue(scopeRef)),
  );
}
