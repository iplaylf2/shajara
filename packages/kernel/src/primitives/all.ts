import type { Blueprint, Plan } from "#src/contracts/plan";
import { flow, pipe } from "fp-ts/function";
import type { Either } from "fp-ts/Either";
import type { UnknownArray } from "type-fest";
import { awaitScopeConverged } from "#src/primitives-kit/await-scope-converged";
import { awaitSupervisedScope } from "#src/primitives-kit/await-supervised-scope";
import { narrowArrayAs } from "#src/utils/narrow.js";
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
          plan.map(readonlyArray.map(({ scopeRef }) => awaitSupervisedScope(scopeRef))),
          plan.chain(plan.sequence),
          plan.map(narrowArrayAs<BranchReturnValues>()),
        ),
      supervisorScopeSpec(),
    ),
    plan.liftF,
    plan.chain(({ scopeRef }) => awaitScopeConverged(scopeRef)),
  );
}
