import type { Plan, Syscall } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";

function lowerRuntimeStep<ReturnValue>(
  runtimePlan: RuntimePlan<ReturnValue>,
  step: IteratorResult<Syscall<unknown>, ReturnValue>,
): Plan<ReturnValue> {
  if (step.done) {
    return {
      kind: "pure",
      value: step.value,
    };
  }

  return {
    kind: "impure",
    syscall: step.value,
    terminate: () => lowerRuntimeReturn(runtimePlan),
    then: (response: unknown) => lowerRuntimeNext(runtimePlan, response),
  };
}

function lowerRuntimeNext<ReturnValue>(
  runtimePlan: RuntimePlan<ReturnValue>,
  response: unknown,
): Plan<ReturnValue> {
  return lowerRuntimeStep(runtimePlan, runtimePlan.next(response));
}

function lowerRuntimeReturn<ReturnValue>(runtimePlan: RuntimePlan<ReturnValue>): Plan<ReturnValue> {
  return lowerRuntimeStep(runtimePlan, runtimePlan.return(null as ReturnValue));
}

export function lowerPlan<ReturnValue>(runtimePlan: RuntimePlan<ReturnValue>): Plan<ReturnValue> {
  return lowerRuntimeNext(runtimePlan, null);
}
