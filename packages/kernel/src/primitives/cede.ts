import type { Plan } from "#src/plan";
import { notImplemented } from "#src/internal/not-implemented";

export function cede(): Plan<void> {
  return notImplemented("kernel primitive 'cede'");
}
