import type { Blueprint, Failure, Plan } from "#src/contracts";
import { awaitProcessInBand, awaitScopeConverged } from "#src/primitives-kit";
import { flow, pipe } from "fp-ts/function";
import { fork, spawn } from "#src/syscalls";
import type { Either } from "#src/utils";
import type { UnknownArray } from "type-fest";
import { narrowArrayAs } from "#src/utils";
import { plan } from "#src/internal/fp";
import { readonlyArray } from "fp-ts";
import { supervisorScopeSpec } from "#src/scopes";

export function all<BranchReturns extends UnknownArray>(
  branches: AllBranches<BranchReturns>,
): Plan<Either<Failure, BranchReturns>> {
  return pipe(
    spawn(allSupervisor(branches), supervisorScopeSpec()),
    plan.liftF,
    plan.chain(({ scopeRef }) => awaitScopeConverged(scopeRef)),
  );
}

function allSupervisor<BranchReturns extends UnknownArray>(
  branches: AllBranches<BranchReturns>,
): Blueprint<BranchReturns> {
  return () =>
    pipe(
      branches,
      readonlyArray.map(flow(fork, plan.liftF)),
      plan.sequence,
      plan.map(readonlyArray.map(awaitProcessInBand)),
      plan.chain(plan.sequence),
      plan.map(narrowArrayAs<BranchReturns>()),
    );
}

type AllBranches<BranchReturns extends UnknownArray> = {
  readonly [Index in keyof BranchReturns]: Blueprint<BranchReturns[Index]>;
};
