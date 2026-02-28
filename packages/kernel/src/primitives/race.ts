// oxlint-disable max-lines-per-function
import type { ArrayValues, UnknownArray } from "type-fest";
import type { Blueprint, KhoraFailure, Plan } from "#src/contracts";
import { awaitScopeConverged, awaitSupervisedScope } from "#src/primitives-kit";
import { either, readonlyArray } from "fp-ts";
import { fork, halt, post, receive, self, spawn } from "#src/syscalls";
import type { Either } from "#src/utils";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { supervisorScopeSpec } from "#src/scopes";

type RaceBranches<BranchReturns extends UnknownArray> = {
  readonly [Index in keyof BranchReturns]: Blueprint<BranchReturns[Index]>;
};

export function race<BranchReturns extends UnknownArray>(
  branches: RaceBranches<BranchReturns>,
): Plan<Either<KhoraFailure, ArrayValues<BranchReturns>>> {
  type Value = ArrayValues<BranchReturns>;
  return pipe(
    spawn(() =>
      pipe(
        plan.Do,
        plan.bindF("raceSelf", self),
        plan.bindF("arenaSelf", ({ raceSelf: { scopeRef: raceRef } }) =>
          spawn(
            () =>
              pipe(
                self(),
                plan.liftF,
                plan.chainF(({ scopeRef: arenaRef }) =>
                  spawn(() =>
                    pipe(
                      branches,
                      readonlyArray.map((branch) =>
                        pipe(
                          spawn(() =>
                            pipe(
                              branch(),
                              plan.chainF((value) => post(arenaRef, value satisfies Value)),
                            ),
                          ),
                          plan.liftF,
                        ),
                      ),
                      plan.sequence,
                    ),
                  ),
                ),
                plan.chainF(() => receive<Value>()),
                plan.chainF(({ value }) =>
                  post(raceRef, either.right(value) satisfies Either<never, Value>),
                ),
                plan.chainF(() => halt()),
              ),
            supervisorScopeSpec(),
          ),
        ),
        plan.chainF(({ arenaSelf: { scopeRef: arenaRef }, raceSelf: { scopeRef: raceRef } }) =>
          fork(() =>
            pipe(
              arenaRef,
              awaitScopeConverged,
              plan.chainF((value) => post(raceRef, value satisfies Either<KhoraFailure, never>)),
            ),
          ),
        ),
        plan.chainF(() => receive<Either<KhoraFailure, Value>>()),
        plan.map(({ value }) => value),
      ),
    ),
    plan.liftF,
    plan.chain(({ scopeRef }) => awaitSupervisedScope(scopeRef)),
  );
}
