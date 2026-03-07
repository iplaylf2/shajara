import type { RuntimePlan, ScopeRef, SelfDescriptor } from "#src/contracts";
import { self as kernelSelf } from "@shajara/kernel";
import { liftBlueprint } from "#src/boundary";

export function self<Scope extends ScopeRef<unknown>>(): RuntimePlan<SelfDescriptor<Scope>> {
  return liftBlueprint(() => kernelSelf<Scope>())();
}
