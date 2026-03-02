import type { ContextKey, Plan } from "#src/contracts";
import { notImplemented } from "#src/internal/not-implemented";

export function bind<Value>(_key: ContextKey<Value>, _value: Value): Plan<void> {
  return notImplemented("kernel primitive 'bind'");
}
