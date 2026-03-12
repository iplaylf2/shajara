import type { RiteCoroutine, RiteRoutine } from "#src/contracts";
import { decodeRitual, encodeRitual, unwrapEither } from "#src/boundary";
import { scoped as kernelScoped } from "@shajara/kernel";

export function* scoped<Return>(ritual: RiteRoutine<Return>): RiteCoroutine<Return> {
  const outcome = yield* encodeRitual(() => kernelScoped(decodeRitual(ritual)))();
  return unwrapEither(outcome);
}
