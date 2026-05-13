import type { ContextKey, Presence, RiteCoroutine } from "#/contracts";
import { encodeRitual, unwrapOption } from "#/boundary/index";
import { lookup as kernelLookup } from "@shajara/kernel";

/**
 * Looks up a value from current scope context.
 *
 * @param key - Context identity.
 * @returns `[true, value]` when bound, or `[false]` when absent.
 */
export function* lookup<Value>(key: ContextKey<Value>): RiteCoroutine<Presence<Value>> {
  const outcome = yield* encodeRitual(() => kernelLookup<Value>(key))();
  return unwrapOption(outcome);
}
