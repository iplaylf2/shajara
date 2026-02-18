import type { Plan } from "#src/plan-contract";
import { notImplemented } from "#src/internal/not-implemented";

export interface KernelRaceResult<ReturnValue> {
  readonly winnerIndex: number;
  readonly value: ReturnValue;
}

export function race<ReturnValues extends readonly unknown[]>(_primitives: {
  readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]>;
}): Plan<KernelRaceResult<ReturnValues[number]>> {
  return notImplemented("kernel primitive 'race'");
}
