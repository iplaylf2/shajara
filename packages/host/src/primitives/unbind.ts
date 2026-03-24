import type { ContextKey, RiteCoroutine } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { unbind as kernelUnbind } from "@shajara/kernel";

export function unbind(key: ContextKey<unknown>): RiteCoroutine<void> {
  return encodeRitual(() => kernelUnbind(key))();
}
