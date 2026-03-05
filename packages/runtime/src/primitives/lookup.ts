import type { ContextKey, RuntimePlan } from "#src/contracts";
import { liftBlueprint, unwrapOption } from "#src/boundary";
import { ExternalError } from "#src/errors";
import { lookup as kernelLookup } from "@khora/kernel";

export function* lookup<Value>(key: ContextKey<Value>): RuntimePlan<Value> {
  const option = yield* liftBlueprint(() => kernelLookup<Value>(key));
  return unwrapOption(option, new ExternalError({ key }, "Missing lookup binding"));
}
