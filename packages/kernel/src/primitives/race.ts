import type { ArrayValues, NonEmptyTuple } from "type-fest";
import type { FailureShape, FutureKey, FutureSettleKey, Ritual, Wisp } from "#src/contracts";
import { branch, future, halt, poll, settle, spawn, wait } from "#src/sigils";
import { either, option, readonlyArray } from "fp-ts";
import { wisp, wispOption } from "#src/internal/fp";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";

export function race<BranchReturns extends NonEmptyTuple<unknown>>(
  branches: RaceBranches<BranchReturns>,
): Wisp<FutureKey<ArrayValues<BranchReturns>>> {
  return pipe(
    wisp.Do,
    wisp.bindF("winner", () => future<ArrayValues<BranchReturns>>()),
    wisp.bindF("arenaSelf", ({ winner: [, winnerSettle] }) =>
      branch(raceArena(branches, winnerSettle), { failureMode: "contain" }),
    ),
    wisp.chainFirstF(({ arenaSelf: { scopeRef: arenaRef }, winner: [winnerFuture] }) =>
      spawn(raceBackstop(arenaRef.exitFuture, winnerFuture)),
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
) {
  return () =>
    pipe(
      branches,
      readonlyArray.map((ritual) => pipe(spawn(runBranch(ritual, winnerSettle)), wisp.liftF)),
      wisp.sequence,
    );
}

function raceBackstop(failureFuture: FutureKey<unknown>, winnerFuture: FutureKey<unknown>) {
  return () =>
    pipe(
      wisp.Do,
      wisp.bindF("failureResult", () => wait(failureFuture)),
      wisp.bindF("winnerResult", () => poll(winnerFuture)),
      wisp.map(({ failureResult, winnerResult }) =>
        pipe(
          winnerResult,
          option.match(
            () => option.some(failureResult),
            (_result) => option.none,
          ),
        ),
      ),
      wispOption.map(narrowAs<either.Left<FailureShape>>()),
      wispOption.chainF(({ left }) => halt(left)),
    );
}

function runBranch(ritual: Ritual<unknown>, winnerSettle: FutureSettleKey<unknown>) {
  return () =>
    pipe(
      ritual(),
      wisp.chainF((value) => settle(winnerSettle, either.right(value))),
      wisp.chainF(() => halt()),
    );
}
