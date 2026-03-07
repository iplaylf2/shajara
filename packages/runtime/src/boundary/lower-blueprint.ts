import type { Blueprint, Plan, Syscall } from "@shajara/kernel";
import type { RiteRoutine, RiteCoroutine } from "#src/contracts";
import { ensureExecutor, halt, impurePlan, purePlan } from "@shajara/kernel";
import { isLeft, tryCatch } from "@shajara/kernel/utils";
import { toFailureUnknown } from "./failure-mapping";

export function lowerBlueprint<Return>(
  runtimeBlueprint: RiteRoutine<Return>,
): Blueprint<Return> {
  function lowered(): Plan<Return> {
    const startedPlan = tryCatch(() => runtimeBlueprint(), toFailureUnknown);
    if (isLeft(startedPlan)) {
      return halt(startedPlan.left);
    }

    const runtimePlan = startedPlan.right;

    const executor = ensureExecutor();
    executor.registerCleanup(lowered, () => lowerRuntimeReturn(runtimePlan));

    return lowerRuntimeNext(runtimePlan, null);
  }

  return lowered;
}

function lowerRuntimeNext<Return>(
  runtimePlan: RiteCoroutine<Return>,
  response: unknown,
): Plan<Return> {
  const nextStep = tryCatch(() => runtimePlan.next(response), toFailureUnknown);
  if (isLeft(nextStep)) {
    return halt(nextStep.left);
  }

  return lowerRuntimeStep(runtimePlan, nextStep.right);
}

function lowerRuntimeStep<Return>(
  runtimePlan: RiteCoroutine<Return>,
  step: IteratorResult<Syscall, Return>,
): Plan<Return> {
  if (step.done) {
    return purePlan(step.value);
  }

  return impurePlan(step.value, (response) => lowerRuntimeNext(runtimePlan, response));
}

function lowerRuntimeReturn<Return>(runtimePlan: RiteCoroutine<Return>): Plan<Return> {
  const nextStep = tryCatch(() => runtimePlan.return(null as Return), toFailureUnknown);
  if (isLeft(nextStep)) {
    return halt(nextStep.left);
  }

  return lowerRuntimeStep(runtimePlan, nextStep.right);
}
