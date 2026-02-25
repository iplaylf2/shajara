import type { Plan } from "#src/contracts/plan";
import { plan } from "#src/internal/fp/plan";
import { halt as syscallHalt } from "#src/syscalls";

export function halt(fault?: unknown): Plan<never> {
  return plan.liftF(syscallHalt(fault));
}
