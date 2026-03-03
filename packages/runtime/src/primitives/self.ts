import type { ScopeRef, SelfDescriptor } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";
import { self as kernelSelf } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/lift-plan";

export function self<Scope extends ScopeRef<unknown>>(): RuntimePlan<SelfDescriptor<Scope>> {
  return liftPlan(kernelSelf<Scope>());
}
