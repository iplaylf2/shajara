import type { ContextKey, RiteCoroutine } from "#src/contracts";
import { encodeRitual } from "#src/boundary";
import { unbind as kernelUnbind } from "@shajara/kernel";

export function unbind(key: ContextKey<unknown>): RiteCoroutine<void> {
  return encodeRitual(() => kernelUnbind(key))();
}
