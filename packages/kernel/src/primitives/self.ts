import type { Plan } from "#src/plan-contract";
import { notImplemented } from "#src/internal/not-implemented";

export function self<SelfDescriptor = unknown>(): Plan<SelfDescriptor> {
  return notImplemented("kernel primitive 'self'");
}
