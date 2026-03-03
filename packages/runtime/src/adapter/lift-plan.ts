import type { Executor, ImpurePlan, Plan, Syscall } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";
import { ensureExecutor } from "@khora/kernel";
import { unreachable } from "@khora/kernel/utils";

export function* liftPlan<Return>(plan: Plan<Return>): RuntimePlan<Return> {
  const executor = ensureExecutor();
  return yield* liftStep(executor, plan);
}

function* liftStep<Return>(executor: Executor, plan: Plan<Return>): RuntimePlan<Return> {
  if (plan.kind === "pure") {
    return plan.value;
  }

  const nextPlan: Plan<Return> = yield* continueFromImpure(executor, plan);
  return yield* liftStep(executor, nextPlan);
}

function* continueFromImpure<Return>(
  executor: Executor,
  impurePlan: ImpurePlan<Syscall, Return>,
): RuntimePlan<Plan<Return>> {
  let nextPlan: Plan<Return> | null = null;

  const resumeValue: unknown = yield impurePlan.syscall;
  try {
    nextPlan = impurePlan.then(resumeValue);
  } finally {
    if (nextPlan === null) {
      const cleanup = executor.consumeCleanup(impurePlan);
      if (cleanup === null) {
        unreachable();
      }
      nextPlan = cleanup() as Plan<Return>;
    }
  }

  return nextPlan;
}
