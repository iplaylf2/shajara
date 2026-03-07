import type { RiteCoroutine, ScopeRef, SelfDescriptor } from "#src/contracts";
import { self as kernelSelf } from "@shajara/kernel";
import { encodeRitual } from "#src/boundary";

export function self<Scope extends ScopeRef<unknown>>(): RiteCoroutine<SelfDescriptor<Scope>> {
  return encodeRitual(() => kernelSelf<Scope>())();
}
