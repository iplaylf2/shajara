import type { ImpurePlan, Plan, Syscall } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";

export function* liftPlan<Return>(plan: Plan<Return>): RuntimePlan<Return> {
  return yield* liftStep(plan);
}

function* liftStep<Return>(plan: Plan<Return>): RuntimePlan<Return> {
  if (plan.kind === "pure") {
    return plan.value;
  }

  const nextPlan: Plan<Return> = yield* continueFromImpure(plan);
  return yield* liftStep(nextPlan);
}

function* continueFromImpure<Return>(
  impurePlan: ImpurePlan<Syscall, Return>,
): RuntimePlan<Plan<Return>> {
  let nextPlan: Plan<Return> | null = null;

  try {
    const resumeValue: unknown = yield impurePlan.syscall;
    nextPlan = impurePlan.then(resumeValue);
  } finally {
    // Keep terminate-as-default when close/termination interrupts resume.
    if (nextPlan === null) {
      nextPlan = impurePlan.terminate() as Plan<Return>;
    }
  }

  return nextPlan;
}
