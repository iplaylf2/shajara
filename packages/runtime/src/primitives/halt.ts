import type { RuntimePlan } from "#src/contracts";
import { ScopeHaltedError } from "#src/errors";
import { halt as kernelHalt } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/adapter/lift-blueprint";
import { toFailure } from "#src/primitives-kit";

export function halt(error: Error = new ScopeHaltedError()): RuntimePlan<never> {
  return liftBlueprint(() => kernelHalt(toFailure(error)));
}
