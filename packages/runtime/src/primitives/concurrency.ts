import type { RuntimePlan, RuntimePrimitive } from "#src/runtime-kit/runtime-protocol";
import type { RuntimeBlueprint } from "#src/blueprint";
import type { RuntimeSpawnRef } from "#src/runtime-kit/runtime-entities";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

interface RuntimeRaceResult<ReturnValue> {
  readonly winnerIndex: number;
  readonly value: ReturnValue;
}

type RuntimeResumableErrorHandler<CaughtValue> = (
  error: Error,
) => RuntimePlan<CaughtValue>;

type RuntimePrimitiveTuple<ReturnValues extends readonly unknown[]> = {
  [Index in keyof ReturnValues]: RuntimePrimitive<ReturnValues[Index]>;
};

function spawn<ReturnValue>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<RuntimeSpawnRef> {
  return notImplementedRuntimePrimitive("spawn");
}

function all<ReturnValues extends readonly unknown[]>(
  _primitives: RuntimePrimitiveTuple<ReturnValues>,
): RuntimePlan<ReturnValues> {
  return notImplementedRuntimePrimitive("all");
}

function race<ReturnValues extends readonly unknown[]>(
  _primitives: RuntimePrimitiveTuple<ReturnValues>,
): RuntimePlan<RuntimeRaceResult<ReturnValues[number]>> {
  return notImplementedRuntimePrimitive("race");
}

function scoped<ReturnValue, CaughtValue = never>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
  _onResumableError?: RuntimeResumableErrorHandler<CaughtValue> | undefined,
): RuntimePlan<ReturnValue | CaughtValue> {
  return notImplementedRuntimePrimitive("scoped");
}

function resumable<ReturnValue>(
  _blueprint: RuntimeBlueprint<ReturnValue>,
): RuntimePlan<ReturnValue> {
  return notImplementedRuntimePrimitive("resumable");
}

export { all, race, resumable, scoped, spawn };
export type { RuntimeRaceResult, RuntimeResumableErrorHandler };
