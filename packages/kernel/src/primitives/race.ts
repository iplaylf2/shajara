import type { Blueprint, KhoraFailure, Plan, ScopeRef } from "#src/contracts";
import { awaitScope, halt, spawn } from "#src/syscalls";
import { flow, pipe } from "fp-ts/function";
import type { Either } from "#src/utils";
import type { UnknownArray } from "type-fest";
import { awaitScopeConverged } from "#src/primitives-kit";
import { notImplemented } from "#src/internal/not-implemented";
import { plan } from "#src/internal/fp";
import { readonlyArray } from "fp-ts";
import { scopeTerminated } from "#src/failures";
import { supervisorScopeSpec } from "#src/scopes";
import { unreachable } from "#src/utils";

export interface RaceResult<Return> {
  readonly winnerIndex: number;
  readonly value: Return;
}

type RaceBranches<BranchReturns extends UnknownArray> = {
  readonly [Index in keyof BranchReturns]: Blueprint<BranchReturns[Index]>;
};

interface IndexedRef<Return> {
  readonly scopeRef: ScopeRef<Return>;
  readonly winnerIndex: number;
}

/**
 * Blocks until one of the watched scopes exits, returning the first to do so.
 *
 * This requires a blocking multi-target observation primitive (e.g.
 * `awaitAnyScope`) that does not yet exist in the syscall inventory.
 * The current syscall set only offers `pollScope` (non-blocking, single target)
 * and `awaitScope` (blocking, single target), neither of which can express
 * "block until any one of N scopes exits" without either busy-polling or
 * over-committing to a specific branch.
 */
function awaitFirstExited<Return>(
  _indexedRefs: ReadonlyArray<IndexedRef<Return>>,
): Plan<IndexedRef<Return>> {
  return notImplemented("awaitFirstExited: requires awaitAnyScope syscall");
}

/**
 * Given the elected winner, reads its exit and either returns the RaceResult
 * or propagates the failure upward via halt.
 *
 * Because `awaitScope` returns immediately for an already-exited scope, this
 * does not add an extra blocking step once a winner has been identified.
 */
function observeWinner<Return>(winner: IndexedRef<Return>): Plan<RaceResult<Return>> {
  return pipe(
    plan.liftF(awaitScope(winner.scopeRef)),
    plan.chain((exit) => {
      switch (exit.kind) {
        case "completed":
          return plan.pure({ value: exit.value, winnerIndex: winner.winnerIndex });
        case "failed":
          return plan.liftF(halt(exit.fault));
        case "terminated":
          return plan.liftF(halt(scopeTerminated(winner.scopeRef)));
        default:
          return unreachable();
      }
    }),
  );
}

export function race<BranchReturns extends UnknownArray>(
  branches: RaceBranches<BranchReturns>,
): Plan<Either<KhoraFailure, RaceResult<BranchReturns[number]>>> {
  return pipe(
    spawn(
      () =>
        pipe(
          branches,
          readonlyArray.map(flow(spawn, plan.liftF)),
          plan.sequence,
          plan.map(
            readonlyArray.mapWithIndex(
              (winnerIndex, { scopeRef }): IndexedRef<BranchReturns[number]> => ({
                scopeRef: scopeRef as ScopeRef<BranchReturns[number]>,
                winnerIndex,
              }),
            ),
          ),
          plan.chain((indexedRefs) =>
            pipe(awaitFirstExited(indexedRefs), plan.chain(observeWinner)),
          ),
        ),
      supervisorScopeSpec(),
    ),
    plan.liftF,
    plan.chain(({ scopeRef }) => awaitScopeConverged(scopeRef)),
  );
}
