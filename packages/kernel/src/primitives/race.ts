import type { Blueprint, KhoraFailure, Plan } from "#src/contracts";
import type { Either } from "#src/utils";
import type { UnknownArray } from "type-fest";
import { notImplemented } from "#src/internal/not-implemented";

export interface RaceResult<Return> {
  readonly winnerIndex: number;
  readonly value: Return;
}

export function race<BranchReturns extends UnknownArray>(_branches: {
  readonly [Index in keyof BranchReturns]: Blueprint<BranchReturns[Index]>;
}): Plan<Either<KhoraFailure, RaceResult<BranchReturns[number]>>> {
  return notImplemented("kernel primitive 'race'");
}
