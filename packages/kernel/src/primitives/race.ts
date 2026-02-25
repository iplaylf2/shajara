import type { Blueprint, Plan } from "#src/contracts/plan";
import type { Either } from "fp-ts/Either";
import type { UnknownArray } from "type-fest";
import { notImplemented } from "#src/internal/not-implemented";

export interface RaceResult<ReturnValue> {
  readonly winnerIndex: number;
  readonly value: ReturnValue;
}

export function race<BranchReturnValues extends UnknownArray>(_branches: {
  readonly [Index in keyof BranchReturnValues]: Blueprint<BranchReturnValues[Index]>;
}): Plan<Either<unknown, RaceResult<BranchReturnValues[number]>>> {
  return notImplemented("kernel primitive 'race'");
}
