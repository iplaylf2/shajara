import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

function bind<Key extends string, Value>(
  _key: Key,
  _value: Value,
): RuntimePlan<void> {
  return notImplementedRuntimePrimitive("bind");
}

function lookup<Value>(_key: string): RuntimePlan<Value> {
  return notImplementedRuntimePrimitive("lookup");
}

export { bind, lookup };
