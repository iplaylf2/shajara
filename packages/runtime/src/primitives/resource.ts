import type { RuntimePlan } from "#src/runtime-kit/runtime-protocol";
import { notImplementedRuntimePrimitive } from "#src/runtime-kit/not-implemented";

export type RuntimeResourceProvide<ProvidedValue> = (value: ProvidedValue) => RuntimePlan<never>;

export type RuntimeResourceBody<ProvidedValue> = (
  provide: RuntimeResourceProvide<ProvidedValue>,
) => RuntimePlan<unknown>;

export const resource = <ProvidedValue>(
  _body: RuntimeResourceBody<ProvidedValue>,
): RuntimePlan<ProvidedValue> => notImplementedRuntimePrimitive("resource");
