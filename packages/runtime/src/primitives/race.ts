import type { RuntimePlan } from "#src/contracts/plan";
import type { RuntimePrimitiveTuple } from "#src/contracts/primitive-tuple";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export interface RuntimeRaceResult<ReturnValue> {
  readonly winnerIndex: number;
  readonly value: ReturnValue;
}

export const race = <ReturnValues extends readonly unknown[]>(
  _primitives: RuntimePrimitiveTuple<ReturnValues>,
): RuntimePlan<RuntimeRaceResult<ReturnValues[number]>> => notImplementedRuntimePrimitive("race");
