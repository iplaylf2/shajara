import type { Plan } from "#src/plan";
import { notImplemented } from "#src/internal/not-implemented";

export function resumable<ReturnValue>(_plan: Plan<ReturnValue>): Plan<ReturnValue> {
  return notImplemented("kernel primitive 'resumable'");
}
