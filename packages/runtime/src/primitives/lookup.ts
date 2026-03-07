import type { ContextKey, RiteCoroutine } from "#src/contracts";
import { liftBlueprint, unwrapOption } from "#src/boundary";
import { ExternalError } from "#src/errors";
import { lookup as kernelLookup } from "@shajara/kernel";

export function* lookup<Value>(key: ContextKey<Value>): RiteCoroutine<Value> {
  const outcome = yield* liftBlueprint(() => kernelLookup<Value>(key))();
  return unwrapOption(outcome, new ExternalError({ key }, "Missing lookup binding"));
}
