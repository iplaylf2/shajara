import type { Wisp, ScopeRef } from "#src/contracts";
import type { SelfDescriptor } from "#src/sigils";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";
import { self as selfSigil } from "#src/sigils";

export type { SelfDescriptor } from "#src/sigils";

export function self<Scope extends ScopeRef<unknown>>(): Wisp<SelfDescriptor<Scope>> {
  return pipe(selfSigil(), wisp.liftF, wisp.map(narrowAs<any>()));
}
