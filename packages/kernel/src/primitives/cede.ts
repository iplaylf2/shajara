import type { Plan } from "#src/contracts";
import { cede as cedeSyscall } from "#src/syscalls";
import { plan } from "#src/internal/fp";

export function cede(): Plan<void> {
  return plan.liftF(cedeSyscall());
}
