import type { ContextKey, RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { unbind as kernelUnbind } from "@shajara/kernel";

/** Removes a context binding from the current scope. */
export function unbind(key: ContextKey<unknown>): RiteCoroutine<void> {
  return encodeRitual(() => kernelUnbind(key))();
}
