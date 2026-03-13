import type { Failure, RiteCoroutine, RiteRoutine } from "#src/contracts";
import { decodeRitual, encodeRitual, unwrapEither } from "#src/boundary";
import type { Either } from "@shajara/kernel/utils";
import { scoped as kernelScoped } from "@shajara/kernel";

export function* scoped<Return>(ritual: RiteRoutine<Return>): RiteCoroutine<Return> {
  const outcome = yield* encodeRitual(() => kernelScoped(decodeRitual(ritual)))();
  return unwrapEither(outcome as Either<Failure, Return>);
}
