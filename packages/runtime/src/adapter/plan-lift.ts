import type { Plan } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";

export function liftPlan<ReturnValue>(_plan: Plan<ReturnValue>): RuntimePlan<ReturnValue> {
  throw new Error(
    "Not implemented: lifting kernel Plan<ReturnValue> into RuntimePlan<ReturnValue>.",
  );
}

// IMPORTANT: Plan.terminate is a control-flow branch, not an error value branch.
// It must align with generator.return() so user try...finally blocks run during close/termination.
export interface RuntimeTerminationSemantics {
  readonly driveTerminateViaGeneratorReturn: true;
}
