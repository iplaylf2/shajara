import type { ContextKey, RiteCoroutine } from "#/contracts";
import { encodeRitual, unwrapOption } from "#/boundary";
import type { Optional } from "type-fest";
import { lookup as kernelLookup } from "@shajara/kernel";

export function* lookup<Value>(key: ContextKey<Value>): RiteCoroutine<Optional<Value>> {
  const outcome = yield* encodeRitual(() => kernelLookup<Value>(key))();
  return unwrapOption(outcome);
}
