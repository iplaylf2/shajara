// oxlint-disable max-lines-per-function
import type { ArrayValues, UnknownArray } from "type-fest";
import type { Blueprint, KhoraFailure, Plan } from "#src/contracts";
import { either, readonlyArray } from "fp-ts";
import { fork, halt, receive, self, send, spawn } from "#src/syscalls";
import type { Either } from "#src/utils";
import { awaitScopeConverged } from "#src/primitives-kit";
import { channel } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { supervisorScopeSpec } from "#src/scopes";

type RaceBranches<BranchReturns extends UnknownArray> = {
  readonly [Index in keyof BranchReturns]: Blueprint<BranchReturns[Index]>;
};

const raceChannel = channel<Either<KhoraFailure, unknown>>();
const haltChannel = channel<null>();

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
                          plan.chainF((value) => send(callerRef, raceChannel, either.right(value))),
                          plan.chainF(() => send(arenaRef, haltChannel, null)),
                        ),
                      ),
                      plan.liftF,
                    ),
                  ),
                  plan.sequence,
                ),
              ),
            ),
            plan.chainF(() => receive(haltChannel)),
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
          plan.chainF((value) => send(callerRef, raceChannel, value)),
        ),
      ),
    ),
    plan.chainF(() => receive(raceChannel)),
    plan.map(({ value }) => value),
  );
}
