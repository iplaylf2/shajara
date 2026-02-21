import type { Plan } from "#src/plan";
import { notImplemented } from "#src/internal/not-implemented";

export function suspend(): Plan<never> {
  return notImplemented("kernel primitive 'suspend'");
}
