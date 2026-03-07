import type { RiteRoutine, RiteCoroutine } from "#src/contracts";
import { decodeRitual, encodeRitual, unwrapEither } from "#src/boundary";
import { scoped as kernelScoped } from "@shajara/kernel";

export function* scoped<Return>(blueprint: RiteRoutine<Return>): RiteCoroutine<Return> {
  const outcome = yield* encodeRitual(() => kernelScoped(decodeRitual(blueprint)))();
  return unwrapEither(outcome);
}
