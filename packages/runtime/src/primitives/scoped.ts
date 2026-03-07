import type { RiteRoutine, RiteCoroutine } from "#src/contracts";
import { liftBlueprint, lowerBlueprint, unwrapEither } from "#src/boundary";
import { scoped as kernelScoped } from "@shajara/kernel";

export function* scoped<Return>(blueprint: RiteRoutine<Return>): RiteCoroutine<Return> {
  const outcome = yield* liftBlueprint(() => kernelScoped(lowerBlueprint(blueprint)))();
  return unwrapEither(outcome);
}
