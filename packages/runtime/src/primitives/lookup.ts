import type { ContextKey } from "@khora/kernel";
import { ExternalError } from "#src/errors";
import type { RuntimePlan } from "#src/contracts";
import { lookup as kernelLookup } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { unwrapOption } from "#src/primitives-kit";

export function* lookup<Value>(key: ContextKey<Value>): RuntimePlan<Value> {
  const option = yield* liftPlan(kernelLookup<Value>(key));
  return unwrapOption(option, new ExternalError("Missing lookup binding"));
}
