import type { RiteCoroutine, ScopeRef, SelfDescriptor } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { self as kernelSelf } from "@shajara/kernel";

export function self<Scope extends ScopeRef<unknown>>(): RiteCoroutine<SelfDescriptor<Scope>> {
  return encodeRitual(() => kernelSelf<Scope>())();
}
