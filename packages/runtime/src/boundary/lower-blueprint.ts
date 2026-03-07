import type { Ritual, Wisp, Sigil } from "@shajara/kernel";
import type { RiteRoutine, RiteCoroutine } from "#src/contracts";
import { ensureExecutor, halt, stirringWisp, restingWisp } from "@shajara/kernel";
import { isLeft, tryCatch } from "@shajara/kernel/utils";
import { toFailureUnknown } from "./failure-mapping";

export function lowerBlueprint<Return>(
  runtimeBlueprint: RiteRoutine<Return>,
): Ritual<Return> {
  function lowered(): Wisp<Return> {
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
): Wisp<Return> {
  const nextStep = tryCatch(() => runtimePlan.next(response), toFailureUnknown);
  if (isLeft(nextStep)) {
    return halt(nextStep.left);
  }

  return lowerRuntimeStep(runtimePlan, nextStep.right);
}

function lowerRuntimeStep<Return>(
  runtimePlan: RiteCoroutine<Return>,
  step: IteratorResult<Sigil, Return>,
): Wisp<Return> {
  if (step.done) {
    return restingWisp(step.value);
  }

  return stirringWisp(step.value, (response) => lowerRuntimeNext(runtimePlan, response));
}

function lowerRuntimeReturn<Return>(runtimePlan: RiteCoroutine<Return>): Wisp<Return> {
  const nextStep = tryCatch(() => runtimePlan.return(null as Return), toFailureUnknown);
  if (isLeft(nextStep)) {
    return halt(nextStep.left);
  }

  return lowerRuntimeStep(runtimePlan, nextStep.right);
}
