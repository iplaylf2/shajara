import type { Wisp } from "#src/contracts";
import { cede as cedeSyscall } from "#src/syscalls";
import { plan } from "#src/internal/fp";

export function cede(): Wisp<void> {
  return plan.liftF(cedeSyscall());
}
