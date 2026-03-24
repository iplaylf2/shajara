import type { ScopeRef, Wisp } from "#/contracts";
import type { SelfHandle } from "#/sigils";
import { self as selfSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export type { SelfHandle } from "#/sigils";

export function self<Scope extends ScopeRef<unknown>>(): Wisp<SelfHandle<Scope>> {
  return wisp.liftF(selfSigil()) as Wisp<SelfHandle<Scope>>;
}
