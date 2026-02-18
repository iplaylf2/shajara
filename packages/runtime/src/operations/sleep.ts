import type { RuntimePlan } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

export function sleep(_milliseconds: number): RuntimePlan<void> {
  return notImplemented("runtime operation 'sleep'");
}
