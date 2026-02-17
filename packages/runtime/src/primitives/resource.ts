import type { RuntimePlan } from "#src/contracts/plan";
import { notImplementedRuntimePrimitive } from "#src/internal/not-implemented";

export type RuntimeResourceProvide<ProvidedValue> = (value: ProvidedValue) => RuntimePlan<never>;

export type RuntimeResourceBody<ProvidedValue> = (
  provide: RuntimeResourceProvide<ProvidedValue>,
) => RuntimePlan<unknown>;

export const resource = <ProvidedValue>(
  _body: RuntimeResourceBody<ProvidedValue>,
): RuntimePlan<ProvidedValue> => notImplementedRuntimePrimitive("resource");
