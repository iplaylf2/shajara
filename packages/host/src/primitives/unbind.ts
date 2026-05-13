import type { ContextKey, RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { unbind as kernelUnbind } from "@shajara/kernel";

/** Removes the current scope's binding for a context key. */
export function unbind(key: ContextKey<unknown>): RiteCoroutine<void> {
  return encodeRitual(() => kernelUnbind(key))();
}
