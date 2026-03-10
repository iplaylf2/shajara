import type { ContextKey, RiteCoroutine } from "#src/contracts";
import { encodeRitual, unwrapOption } from "#src/boundary";
import { lookup as kernelLookup } from "@shajara/kernel";

export function* lookup<Value>(key: ContextKey<Value>): RiteCoroutine<Value | undefined> {
  const outcome = yield* encodeRitual(() => kernelLookup<Value>(key))();
  return unwrapOption(outcome);
}
