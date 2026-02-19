import type { ImpurePlan, Plan, Result } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";

function* continueFromImpure<ReturnValue>(
  impurePlan: ImpurePlan<unknown, ReturnValue>,
): RuntimePlan<Plan<ReturnValue>> {
  let nextPlan: Plan<ReturnValue> = impurePlan.terminate();

  try {
    const result: Result<unknown> = yield impurePlan.syscall;
    nextPlan = impurePlan.then(result);
  } finally {
    // Keep terminate-as-default when close/termination interrupts resume.
  }

  return nextPlan;
}

export function* liftPlan<ReturnValue>(plan: Plan<ReturnValue>): RuntimePlan<ReturnValue> {
  let currentPlan: Plan<ReturnValue> = plan;

  while (currentPlan.kind !== "pure") {
    currentPlan = yield* continueFromImpure(currentPlan);
  }

  return currentPlan.value;
}

// IMPORTANT: Plan.terminate is a control-flow branch, not an error value branch.
// It must align with generator.return() so user try...finally blocks run during close/termination.
export interface RuntimeTerminationSemantics {
  readonly driveTerminateViaGeneratorReturn: true;
}
