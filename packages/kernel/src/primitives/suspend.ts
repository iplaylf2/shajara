import type { Plan } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

export function suspend(): Plan<never> {
  return notImplemented("kernel primitive 'suspend'");
}
