import type { ScopeRef, Wisp } from "#src/contracts";
import type { SelfHandle } from "#src/sigils";
import { self as selfSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export type { SelfHandle } from "#src/sigils";

export function self<Scope extends ScopeRef<unknown>>(): Wisp<SelfHandle<Scope>> {
  return wisp.liftF(selfSigil()) as Wisp<SelfHandle<Scope>>;
}
