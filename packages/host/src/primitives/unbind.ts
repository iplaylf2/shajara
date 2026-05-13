import type { ContextKey, RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { unbind as kernelUnbind } from "@shajara/kernel";

/**
 * Removes a value from current scope context.
 *
 * @param key - Context identity to remove.
 * @returns Completion after the binding is removed.
 */
export function unbind(key: ContextKey<unknown>): RiteCoroutine<void> {
  return encodeRitual(() => kernelUnbind(key))();
}
