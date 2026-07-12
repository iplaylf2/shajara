import type { ContextKey, RiteCoroutine } from "#/contracts/index.js";
import { encodeRitual } from "#/boundary/index.js";
import { unbind as kernelUnbind } from "@shajara/kernel";

/** Removes the current scope's binding for a context key. */
export function unbind(key: ContextKey<unknown>): RiteCoroutine<void> {
  return encodeRitual(() => kernelUnbind(key))();
}
