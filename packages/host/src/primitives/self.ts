import type { RiteCoroutine, ScopeRef, SelfHandle } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { self as kernelSelf } from "@shajara/kernel";

export function self<Scope extends ScopeRef<unknown>>(): RiteCoroutine<SelfHandle<Scope>> {
  return encodeRitual(() => kernelSelf<Scope>())();
}
