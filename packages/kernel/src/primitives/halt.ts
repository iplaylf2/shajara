import type { Failure, Wisp } from "#src/contracts";
import { halt as haltSyscall } from "#src/syscalls";
import { plan } from "#src/internal/fp";
import { scopeHalted } from "#src/failures";

export function halt(failure: Failure = scopeHalted()): Wisp<never> {
  return plan.liftF(haltSyscall(failure));
}
