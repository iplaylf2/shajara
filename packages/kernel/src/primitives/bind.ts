import type { Plan } from "#src/plan-contract";
import { notImplemented } from "#src/internal/not-implemented";

export function bind<Key extends string, Value>(_key: Key, _value: Value): Plan<void> {
  return notImplemented("kernel primitive 'bind'");
}
