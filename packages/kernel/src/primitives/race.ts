import type { Blueprint, Plan } from "#src/contracts/plan";
import type { Either } from "fp-ts/Either";
import type { UnknownArray } from "type-fest";
import { notImplemented } from "#src/internal/not-implemented";

export interface RaceResult<Return> {
  readonly winnerIndex: number;
  readonly value: Return;
}

export function race<BranchReturns extends UnknownArray>(_branches: {
  readonly [Index in keyof BranchReturns]: Blueprint<BranchReturns[Index]>;
}): Plan<Either<unknown, RaceResult<BranchReturns[number]>>> {
  return notImplemented("kernel primitive 'race'");
}
