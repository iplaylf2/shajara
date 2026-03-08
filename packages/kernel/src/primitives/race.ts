import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { Failure, MessageKey, Ritual, ScopeRef, Wisp } from "#src/contracts";
import { awaitScopeConverged, park } from "#src/primitives-kit";
import { either, readonlyArray } from "fp-ts";
import { fork, halt, receive, self, send, spawn } from "#src/sigils";
import type { Either } from "#src/utils";
import { messageKey } from "#src/contracts";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";
import { wisp } from "#src/internal/fp";

export function race<BranchReturns extends NonEmptyTuple<unknown>>(
  branches: RaceBranches<BranchReturns>,
): Wisp<Either<Failure, ArrayValues<BranchReturns>>> {
  const raceMessageKey = messageKey<Either<Failure, ArrayValues<BranchReturns>>>();

  return pipe(
    wisp.Do,
    wisp.bindF("callerSelf", self),
    wisp.bindF("arenaSelf", ({ callerSelf: { scopeRef: callerRef } }) =>
      spawn(raceArena(branches, callerRef, raceMessageKey), supervisorScopeSpec()),
    ),
    wisp.chainF(({ arenaSelf: { scopeRef: arenaRef }, callerSelf: { scopeRef: callerRef } }) =>
      fork(arenaFailureRelay(arenaRef, callerRef, raceMessageKey)),
    ),
    wisp.chainF(() => receive(raceMessageKey)),
    wisp.map(({ value }) => value),
  );
}

type RaceBranches<BranchReturns extends NonEmptyTuple<unknown>> = {
  readonly [Index in keyof BranchReturns]: Ritual<BranchReturns[Index]>;
};

function raceArena(
  branches: ReadonlyArray<Ritual<unknown>>,
  callerRef: ScopeRef<unknown>,
  raceMessageKey: MessageKey<Either<Failure, unknown>>,
): Ritual<never> {
  return () =>
    pipe(
      branches,
      readonlyArray.map((branch) =>
        pipe(fork(branchRunner(branch, callerRef, raceMessageKey)), wisp.liftF),
      ),
      wisp.sequence,
      wisp.chain(() => park()),
    );
}

function arenaFailureRelay(
  arenaRef: ScopeRef<unknown>,
  callerRef: ScopeRef<unknown>,
  raceMessageKey: MessageKey<Either<Failure, unknown>>,
): Ritual<void> {
  return () =>
    pipe(
      arenaRef,
      awaitScopeConverged,
      wisp.chainF((value) => send(callerRef, raceMessageKey, value)),
    );
}

function branchRunner(
  branch: Ritual<unknown>,
  callerRef: ScopeRef<unknown>,
  raceMessageKey: MessageKey<Either<Failure, unknown>>,
): Ritual<never> {
  return () =>
    pipe(
      branch(),
      wisp.chainF((value) => send(callerRef, raceMessageKey, either.right(value))),
      wisp.chainF(() => halt()),
    );
}
