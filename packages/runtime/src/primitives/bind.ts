import type { RuntimePlan } from "#src/contracts";
import { bind as kernelBind } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";

export const bind = <Key extends string, Value>(key: Key, value: Value): RuntimePlan<void> =>
  liftPlan(kernelBind(key, value));
