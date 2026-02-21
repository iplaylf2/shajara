import type { Plan } from "#src/contracts/plan";
import { notImplemented } from "#src/internal/not-implemented";

export interface RaceResult<ReturnValue> {
  readonly winnerIndex: number;
  readonly value: ReturnValue;
}

export function race<ReturnValues extends readonly unknown[]>(_primitives: {
  readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]>;
}): Plan<RaceResult<ReturnValues[number]>> {
  return notImplemented("kernel primitive 'race'");
}
