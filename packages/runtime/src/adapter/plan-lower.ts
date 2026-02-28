import type { Plan, Syscall } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";

export function lowerPlan<Return>(runtimePlan: RuntimePlan<Return>): Plan<Return> {
  return lowerRuntimeNext(runtimePlan, null);
}

function lowerRuntimeStep<Return>(
  runtimePlan: RuntimePlan<Return>,
  step: IteratorResult<Syscall, Return>,
): Plan<Return> {
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

function lowerRuntimeNext<Return>(
  runtimePlan: RuntimePlan<Return>,
  response: unknown,
): Plan<Return> {
  return lowerRuntimeStep(runtimePlan, runtimePlan.next(response));
}

function lowerRuntimeReturn<Return>(runtimePlan: RuntimePlan<Return>): Plan<Return> {
  return lowerRuntimeStep(runtimePlan, runtimePlan.return(null as Return));
}
