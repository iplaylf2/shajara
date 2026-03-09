import type { Failure, FutureKey, Ritual, Wisp } from "#src/contracts";
import { awaitProcessInBand, forkFuture, unwrapProcessExit } from "#src/primitives-kit";
import { either, readonlyArray } from "fp-ts";
import { flow, pipe } from "fp-ts/function";
import { fork, spawn } from "#src/sigils";
import type { Either } from "#src/utils";
import type { UnknownArray } from "type-fest";
import { narrowArrayAs } from "#src/utils";
import { restingWisp } from "#src/contracts";
import { supervisorScopeSpec } from "#src/scopes";
import { wisp } from "#src/internal/fp";

export function all<BranchReturns extends UnknownArray>(
  branches: AllBranches<BranchReturns>,
): Wisp<FutureKey<Either<Failure, BranchReturns>>> {
  return pipe(
    spawn(allSupervisor(branches), supervisorScopeSpec()),
    wisp.liftF,
    wisp.chain(({ processRef }) =>
      forkFuture(processRef.exitFuture, flow(either.chain(unwrapProcessExit), restingWisp)),
    ),
  );
}

function allSupervisor<BranchReturns extends UnknownArray>(
  branches: AllBranches<BranchReturns>,
): Ritual<BranchReturns> {
  return () =>
    pipe(
      branches,
      readonlyArray.map(flow(fork, wisp.liftF)),
      wisp.sequence,
      wisp.map(readonlyArray.map(awaitProcessInBand)),
      wisp.chain(wisp.sequence),
      wisp.map(narrowArrayAs<BranchReturns>()),
    );
}

type AllBranches<BranchReturns extends UnknownArray> = {
  readonly [Index in keyof BranchReturns]: Ritual<BranchReturns[Index]>;
};
