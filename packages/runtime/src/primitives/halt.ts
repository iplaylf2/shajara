import { liftBlueprint, toFailure } from "#src/boundary";
import type { RuntimePlan } from "#src/contracts";
import { ScopeHaltedError } from "#src/errors";
import { halt as kernelHalt } from "@khora/kernel";

export function halt(error: Error = new ScopeHaltedError()): RuntimePlan<never> {
  return liftBlueprint(() => kernelHalt(toFailure(error)));
}
