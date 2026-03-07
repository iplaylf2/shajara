import type { Wisp, ScopeRef } from "#src/contracts";
import type { SelfDescriptor } from "#src/syscalls";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { wisp } from "#src/internal/fp";
import { self as selfSyscall } from "#src/syscalls";

export type { SelfDescriptor } from "#src/syscalls";

export function self<Scope extends ScopeRef<unknown>>(): Wisp<SelfDescriptor<Scope>> {
  return pipe(selfSyscall(), wisp.liftF, wisp.map(narrowAs<any>()));
}
