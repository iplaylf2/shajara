import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { fromFailure, toFailureUnknown, unwrapEither } from "#src/primitives-kit";
import { left, right } from "@khora/kernel/utils";
import type { Either } from "@khora/kernel/utils";
import type { Failure } from "@khora/kernel";
import { KhoraError } from "#src/contracts";
import type { ResumableRecoveryHandler } from "@khora/kernel/primitives";
import { scoped as kernelScoped } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";

export function* scoped<Return>(
  blueprint: RuntimeBlueprint<Return>,
  onResumableRecovery?: RuntimeResumableRecoveryHandler,
): RuntimePlan<Return> {
  const either = yield* liftPlan(scopedKernelPrimitive(blueprint, onResumableRecovery));
  return unwrapEither(either);
}

export type RuntimeResumableRecoveryHandler = (error: KhoraError) => RuntimePlan<unknown>;

function scopedKernelPrimitive<Return>(
  blueprint: RuntimeBlueprint<Return>,
  onResumableRecovery?: RuntimeResumableRecoveryHandler,
) {
  return kernelScoped<Return>(
    () => lowerPlan(blueprint()),
    toKernelOnResumableRecovery(onResumableRecovery),
  );
}

function toKernelOnResumableRecovery(
  onResumableRecovery: RuntimeResumableRecoveryHandler | undefined,
): ResumableRecoveryHandler | undefined {
  if (!onResumableRecovery) {
    return;
  }
  return (failure: Failure) =>
    lowerPlan(runtimeRecovery(onResumableRecovery, fromFailure(failure)));
}

function* runtimeRecovery(
  onResumableRecovery: RuntimeResumableRecoveryHandler,
  error: KhoraError,
): RuntimePlan<Either<Failure, unknown>> {
  try {
    const replacement = yield* onResumableRecovery(error);
    return right(replacement);
  } catch (caught) {
    return left(toFailureUnknown(caught));
  }
}
