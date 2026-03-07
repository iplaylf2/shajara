import type { Blueprint, Plan } from "@shajara/kernel";
import type { RiteRoutine, RiteCoroutine } from "#src/contracts";

export function liftBlueprint<Return>(blueprint: Blueprint<Return>): RiteRoutine<Return> {
  return function* lifted(): RiteCoroutine<Return> {
    return yield* liftStep(blueprint());
  };
}

function* liftStep<Return>(plan: Plan<Return>): RiteCoroutine<Return> {
  if (plan.kind === "pure") {
    return plan.value;
  }

  const resumeValue: unknown = yield plan.syscall;

  const nextPlan = plan.then(resumeValue);

  return yield* liftStep(nextPlan);
}
