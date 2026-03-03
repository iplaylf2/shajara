import type { Executor, Plan, Syscall } from "@khora/kernel";
import { ensureExecutor, impurePlan, purePlan } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";

export function lowerPlan<Return>(runtimePlan: RuntimePlan<Return>): Plan<Return> {
  const executor = ensureExecutor();
  return lowerRuntimeNext(executor, runtimePlan, null);
}

function lowerRuntimeStep<Return>(
  executor: Executor,
  runtimePlan: RuntimePlan<Return>,
  step: IteratorResult<Syscall, Return>,
): Plan<Return> {
  if (step.done) {
    return purePlan(step.value);
  }

  const impure = impurePlan(step.value, (response) =>
    lowerRuntimeNext(executor, runtimePlan, response),
  );

  executor.registerCleanup(impure, () => lowerRuntimeReturn(executor, runtimePlan));
  return impure;
}

function lowerRuntimeNext<Return>(
  executor: Executor,
  runtimePlan: RuntimePlan<Return>,
  response: unknown,
): Plan<Return> {
  return lowerRuntimeStep(executor, runtimePlan, runtimePlan.next(response));
}

function lowerRuntimeReturn<Return>(
  executor: Executor,
  runtimePlan: RuntimePlan<Return>,
): Plan<Return> {
  return lowerRuntimeStep(executor, runtimePlan, runtimePlan.return(null as Return));
}
