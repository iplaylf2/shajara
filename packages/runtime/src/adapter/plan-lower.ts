import type { Blueprint, Plan, Result, Syscall } from "@khora/kernel";
import type {
  RuntimeBlueprint,
  RuntimePlan,
  RuntimePrimitive,
  RuntimePrimitiveTuple,
} from "#src/contracts";

function lowerIteratorResult<ReturnValue>(
  runtimePlan: RuntimePlan<ReturnValue>,
  iteratorResult: IteratorResult<Syscall<unknown>, ReturnValue>,
): Plan<ReturnValue> {
  if (iteratorResult.done) {
    return {
      kind: "pure",
      value: iteratorResult.value,
    };
  }

  return {
    kind: "impure",
    syscall: iteratorResult.value,
    terminate: () => lowerIteratorResult(runtimePlan, runtimePlan.return(null as ReturnValue)),
    then: (result: Result<unknown>) => lowerIteratorResult(runtimePlan, runtimePlan.next(result)),
  };
}

export function lowerPlan<ReturnValue>(runtimePlan: RuntimePlan<ReturnValue>): Plan<ReturnValue> {
  return lowerIteratorResult(runtimePlan, runtimePlan.next());
}

export function lowerBlueprint<ReturnValue>(
  runtimeBlueprint: RuntimeBlueprint<ReturnValue>,
): Blueprint<ReturnValue> {
  return () => lowerPlan(runtimeBlueprint());
}

export function lowerPrimitiveTuple<ReturnValues extends readonly unknown[]>(
  runtimePrimitives: RuntimePrimitiveTuple<ReturnValues>,
): { readonly [Index in keyof ReturnValues]: Plan<ReturnValues[Index]> };
export function lowerPrimitiveTuple(
  runtimePrimitives: ReadonlyArray<RuntimePrimitive<unknown>>,
): ReadonlyArray<Plan<unknown>> {
  return runtimePrimitives.map((runtimePrimitive) => lowerPlan(runtimePrimitive()));
}
