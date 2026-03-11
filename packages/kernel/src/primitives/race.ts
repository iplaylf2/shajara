import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { Failure, FutureKey, FutureSettleKey, Ritual, Wisp } from "#src/contracts";
import { either, option, readonlyArray } from "fp-ts";
import { fork, future, halt, poll, settle, spawn, wait } from "#src/sigils";
import { wisp, wispOption } from "#src/internal/fp";
import { narrowAs } from "#src/utils";
import { park } from "#src/primitives-kit";
import { pipe } from "fp-ts/function";
import { supervisorScopeSpec } from "#src/scopes";

export function race<BranchReturns extends NonEmptyTuple<unknown>>(
  branches: RaceBranches<BranchReturns>,
): Wisp<FutureKey<ArrayValues<BranchReturns>>> {
  return pipe(
    wisp.Do,
    wisp.bindF("winner", () => future<ArrayValues<BranchReturns>>()),
    wisp.bindF("arenaSelf", ({ winner: [, winnerSettle] }) =>
      spawn(raceArena(branches, winnerSettle), supervisorScopeSpec()),
    ),
    wisp.chainFirst(({ arenaSelf: { scopeRef: arenaRef }, winner: [winnerFuture] }) =>
      pipe(fork(raceBackstop(arenaRef.exitFuture, winnerFuture)), wisp.liftF),
    ),
    wisp.map(({ winner: [winnerFuture] }) => winnerFuture),
  );
}

type RaceBranches<BranchReturns extends NonEmptyTuple<unknown>> = {
  readonly [Index in keyof BranchReturns]: Ritual<BranchReturns[Index]>;
};

function raceArena(
  branches: ReadonlyArray<Ritual<unknown>>,
  winnerSettle: FutureSettleKey<unknown>,
): Ritual<never> {
  return () =>
    pipe(
      branches,
      readonlyArray.map((branch) => pipe(fork(branchRunner(branch, winnerSettle)), wisp.liftF)),
      wisp.sequence,
      wisp.chain(() => park()),
    );
}

function raceBackstop(failureFuture: FutureKey<never>, winnerFuture: FutureKey<unknown>) {
  return () =>
    pipe(
      wait(failureFuture),
      wisp.liftF,
      wisp.chain((failure) =>
        pipe(
          winnerFuture,
          poll,
          wisp.liftF,
          wispOption.match(
            () => pipe(failure, narrowAs<either.Left<Failure>>(), (id) => id.left, option.some),
            (_result) => option.none,
          ),
        ),
      ),
      wispOption.chainF(halt),
    );
}

function branchRunner(
  branch: Ritual<unknown>,
  winnerSettle: FutureSettleKey<unknown>,
): Ritual<never> {
  return () =>
    pipe(
      branch(),
      wisp.chainF((value) => settle(winnerSettle, either.right(value))),
      wisp.chainF(() => halt()),
    );
}
