// oxlint-disable max-lines-per-function
import type { ArrayValues, UnknownArray } from "type-fest";
import type { Blueprint, KhoraFailure, Plan } from "#src/contracts";
import { either, readonlyArray } from "fp-ts";
import { fork, halt, post, receive, self, spawn } from "#src/syscalls";
import type { Either } from "#src/utils";
import { awaitScopeConverged } from "#src/primitives-kit";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { signal } from "#src/contracts";
import { supervisorScopeSpec } from "#src/scopes";

type RaceBranches<BranchReturns extends UnknownArray> = {
  readonly [Index in keyof BranchReturns]: Blueprint<BranchReturns[Index]>;
};

const raceSignal = signal<Either<KhoraFailure, unknown>>();
const haltSignal = signal<null>();

export function race<BranchReturns extends UnknownArray>(
  branches: RaceBranches<BranchReturns>,
): Plan<Either<KhoraFailure, ArrayValues<BranchReturns>>> {
  return pipe(
    plan.Do,
    plan.bindF("callerSelf", self),
    plan.bindF("arenaSelf", ({ callerSelf: { scopeRef: callerRef } }) =>
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
                          plan.chainF((value) => post(callerRef, raceSignal, either.right(value))),
                          plan.chainF(() => post(arenaRef, haltSignal, null)),
                        ),
                      ),
                      plan.liftF,
                    ),
                  ),
                  plan.sequence,
                ),
              ),
            ),
            plan.chainF(() => receive(haltSignal)),
            plan.chainF(() => halt()),
          ),
        supervisorScopeSpec(),
      ),
    ),
    plan.chainF(({ arenaSelf: { scopeRef: arenaRef }, callerSelf: { scopeRef: callerRef } }) =>
      fork(() =>
        pipe(
          arenaRef,
          awaitScopeConverged,
          plan.chainF((value) => post(callerRef, raceSignal, value)),
        ),
      ),
    ),
    plan.chainF(() => receive(raceSignal)),
    plan.map(({ value }) => value),
  );
}
