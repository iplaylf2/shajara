import type { RiteCoroutine, ScopeRef } from "#src/contracts";
import { encodeRitual, unwrapEither } from "#src/boundary";
import { join as kernelJoin } from "@shajara/kernel";

export function* join<Return>(spawned: ScopeRef<Return>): RiteCoroutine<Return> {
  const outcome = yield* encodeRitual(() => kernelJoin(spawned))();
  return unwrapEither(outcome);
}
