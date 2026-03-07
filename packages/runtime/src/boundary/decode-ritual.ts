import type { Ritual, Wisp, Sigil } from "@shajara/kernel";
import type { RiteRoutine, RiteCoroutine } from "#src/contracts";
import { ensureExecutor, halt, stirringWisp, restingWisp } from "@shajara/kernel";
import { isLeft, tryCatch } from "@shajara/kernel/utils";
import { toFailureUnknown } from "./failure-mapping";

export function decodeRitual<Relic>(
  routine: RiteRoutine<Relic>,
): Ritual<Relic> {
  function decoded(): Wisp<Relic> {
    const startedPlan = tryCatch(() => routine(), toFailureUnknown);
    if (isLeft(startedPlan)) {
      return halt(startedPlan.left);
    }

    const runtimePlan = startedPlan.right;

    const executor = ensureExecutor();
    executor.registerCleanup(decoded, () => lowerRuntimeReturn(runtimePlan));

    return lowerRuntimeNext(runtimePlan, null);
  }

  return decoded;
}

function lowerRuntimeNext<Relic>(
  runtimePlan: RiteCoroutine<Relic>,
  response: unknown,
): Wisp<Relic> {
  const nextStep = tryCatch(() => runtimePlan.next(response), toFailureUnknown);
  if (isLeft(nextStep)) {
    return halt(nextStep.left);
  }

  return lowerRuntimeStep(runtimePlan, nextStep.right);
}

function lowerRuntimeStep<Relic>(
  runtimePlan: RiteCoroutine<Relic>,
  step: IteratorResult<Sigil, Relic>,
): Wisp<Relic> {
  if (step.done) {
    return restingWisp(step.value);
  }

  return stirringWisp(step.value, (response) => lowerRuntimeNext(runtimePlan, response));
}

function lowerRuntimeReturn<Relic>(runtimePlan: RiteCoroutine<Relic>): Wisp<Relic> {
  const nextStep = tryCatch(() => runtimePlan.return(null as Relic), toFailureUnknown);
  if (isLeft(nextStep)) {
    return halt(nextStep.left);
  }

  return lowerRuntimeStep(runtimePlan, nextStep.right);
}
