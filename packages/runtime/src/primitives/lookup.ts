import type { ContextKey, RuntimePlan } from "#src/contracts";
import { ExternalError } from "#src/errors";
import { lookup as kernelLookup } from "@khora/kernel/primitives";
import { liftBlueprint } from "#src/adapter/lift-blueprint";
import { unwrapOption } from "#src/primitives-kit";

export function* lookup<Value>(key: ContextKey<Value>): RuntimePlan<Value> {
  const option = yield* liftBlueprint(() => kernelLookup<Value>(key));
  return unwrapOption(option, new ExternalError({ key }, "Missing lookup binding"));
}
