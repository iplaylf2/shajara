import type { Failure, Plan } from "#src/contracts";
import { plan } from "#src/internal/fp";
import { scopeHalted } from "#src/failures";
import { halt as syscallHalt } from "#src/syscalls";

export function halt(fault: Failure = scopeHalted()): Plan<never> {
  return plan.liftF(syscallHalt(fault));
}
