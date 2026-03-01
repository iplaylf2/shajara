import type { Plan, ScopeRef } from "#src/contracts";
import type { SelfDescriptor } from "#src/syscalls";
import { narrowAs } from "#src/utils";
import { pipe } from "fp-ts/function";
import { plan } from "#src/internal/fp";
import { self as selfSyscall } from "#src/syscalls";

export function self<Scope extends ScopeRef<unknown>>(): Plan<SelfDescriptor<Scope>> {
  return pipe(selfSyscall(), plan.liftF, plan.map(narrowAs<any>()));
}
