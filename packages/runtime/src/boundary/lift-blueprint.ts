import type { Blueprint, Plan } from "@shajara/kernel";
import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";

export function liftBlueprint<Return>(blueprint: Blueprint<Return>): RuntimeBlueprint<Return> {
  return function* lifted(): RuntimePlan<Return> {
    return yield* liftStep(blueprint());
  };
}

function* liftStep<Return>(plan: Plan<Return>): RuntimePlan<Return> {
  if (plan.kind === "pure") {
    return plan.value;
  }

  const resumeValue: unknown = yield plan.syscall;

  const nextPlan = plan.then(resumeValue);

  return yield* liftStep(nextPlan);
}
