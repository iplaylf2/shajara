import type { ContextKey, Presence, RiteCoroutine } from "#/contracts";
import { encodeRitual, unwrapOption } from "#/boundary/index";
import { lookup as kernelLookup } from "@shajara/kernel";

export function* lookup<Value>(key: ContextKey<Value>): RiteCoroutine<Presence<Value>> {
  const outcome = yield* encodeRitual(() => kernelLookup<Value>(key))();
  return unwrapOption(outcome);
}
