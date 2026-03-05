import type { RuntimePlan, ScopeRef, SelfDescriptor } from "#src/contracts";
import { self as kernelSelf } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/boundary";

export function self<Scope extends ScopeRef<unknown>>(): RuntimePlan<SelfDescriptor<Scope>> {
  return liftBlueprint(() => kernelSelf<Scope>());
}
