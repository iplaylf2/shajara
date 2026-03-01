import type { Failure, Plan } from "#src/contracts";
import { halt as haltSyscall } from "#src/syscalls";
import { plan } from "#src/internal/fp";
import { scopeHalted } from "#src/failures";

export function halt(fault: Failure = scopeHalted()): Plan<never> {
  return plan.liftF(haltSyscall(fault));
}
