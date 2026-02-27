import type { KhoraFailure, Plan } from "#src/contracts";
import { plan } from "#src/internal/fp";
import { halt as syscallHalt } from "#src/syscalls";

export function halt(fault?: KhoraFailure): Plan<never> {
  return plan.liftF(syscallHalt(fault));
}
