import type { ImpurePlan, Plan } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";

function* continueFromImpure<ReturnValue>(
  impurePlan: ImpurePlan<unknown, ReturnValue>,
): RuntimePlan<Plan<ReturnValue>> {
  let nextPlan: Plan<ReturnValue> | null = null;

  try {
    const resumeValue: unknown = yield impurePlan.syscall;
    nextPlan = impurePlan.then(resumeValue);
  } finally {
    // Keep terminate-as-default when close/termination interrupts resume.
    if (nextPlan === null) {
      nextPlan = impurePlan.terminate();
    }
  }

  return nextPlan as Plan<ReturnValue>;
}

function* liftStep<ReturnValue>(plan: Plan<ReturnValue>): RuntimePlan<ReturnValue> {
  if (plan.kind === "pure") {
    return plan.value;
  }

  const nextPlan: Plan<ReturnValue> = yield* continueFromImpure(plan);
  return yield* liftStep(nextPlan);
}

export function* liftPlan<ReturnValue>(plan: Plan<ReturnValue>): RuntimePlan<ReturnValue> {
  return yield* liftStep(plan);
}
