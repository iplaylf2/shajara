import type { ScopeRef, Wisp } from "#src/contracts";
import type { SelfDescriptor } from "#src/sigils";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { self as selfSigil } from "#src/sigils";
import { wisp } from "#src/internal/fp";

export type { SelfDescriptor } from "#src/sigils";

export function self<Scope extends ScopeRef<unknown>>(): Wisp<SelfDescriptor<Scope>> {
  return pipe(selfSigil(), wisp.liftF, wisp.map(narrowAs<any>()));
}
