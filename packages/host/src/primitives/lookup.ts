import type { ContextKey, Presence, RiteCoroutine } from "#/contracts/index.js";
import { encodeRitual, unwrapOption } from "#/boundary/index.js";
import { lookup as kernelLookup } from "@shajara/kernel";

/**
 * Resolves the nearest visible binding for a context key.
 *
 * @returns `[true, value]` for the nearest visible binding, or `[false]` when absent.
 */
export function* lookup<Value>(key: ContextKey<Value>): RiteCoroutine<Presence<Value>> {
  const outcome = yield* encodeRitual(() => kernelLookup<Value>(key))();
  return unwrapOption(outcome);
}
