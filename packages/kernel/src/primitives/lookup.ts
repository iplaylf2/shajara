import type { Plan } from "#src/plan";
import { notImplemented } from "#src/internal/not-implemented";

export function lookup<Value>(_key: string): Plan<Value> {
  return notImplemented("kernel primitive 'lookup'");
}
