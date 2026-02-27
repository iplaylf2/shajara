import type { ScopeRef, SelfDescriptor } from "@khora/kernel";
import type { RuntimePlan } from "#src/contracts";
import type { StandardScopeRef } from "@khora/kernel/scopes";
import { self as kernelSelf } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export function self<Scope extends ScopeRef<unknown> = StandardScopeRef<unknown>>(): RuntimePlan<
  SelfDescriptor<Scope>
> {
  return liftPlan(kernelSelf<Scope>());
}
