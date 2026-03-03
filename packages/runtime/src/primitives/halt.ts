import type { RuntimePlan } from "#src/contracts";
import { ScopeHaltedError } from "#src/errors";
import { halt as kernelHalt } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/lift-plan";
import { toFailure } from "#src/primitives-kit";

export function halt(error: Error = new ScopeHaltedError()): RuntimePlan<never> {
  return liftPlan(kernelHalt(toFailure(error)));
}
