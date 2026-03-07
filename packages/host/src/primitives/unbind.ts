import type { ContextKey, RiteCoroutine } from "#src/contracts";
import { unbind as kernelUnbind } from "@shajara/kernel";
import { encodeRitual } from "#src/boundary";

export function unbind(key: ContextKey<unknown>): RiteCoroutine<void> {
  return encodeRitual(() => kernelUnbind(key))();
}
