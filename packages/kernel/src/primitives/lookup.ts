import type { ContextKey, Plan } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

export function lookup<Value>(_key: ContextKey<Value>): Plan<Value | undefined> {
  return notImplemented("kernel primitive 'lookup'");
}
