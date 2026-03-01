import type { Failure, ScopeSpec } from "@khora/kernel";
import { KhoraError, failureFromUnknown } from "#src/errors";
import type { ResumableFailureHandler, ScopedOptions } from "@khora/kernel/primitives";
import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { left, right } from "@khora/kernel/utils";
import type { Either } from "@khora/kernel/utils";
import { scoped as kernelScoped } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";
import { unwrapEither } from "#src/primitives-kit";

export function* scoped<Return>(
  blueprint: RuntimeBlueprint<Return>,
  options?: RuntimeScopedOptions,
): RuntimePlan<Return> {
  const either = yield* liftPlan(scopedKernelPrimitive(blueprint, options));
  return unwrapEither(either);
}

export interface RuntimeScopedOptions {
  readonly onResumableBranchFailure?: RuntimeResumableFailureHandler;
  readonly spec?: ScopeSpec;
}

export type RuntimeResumableFailureHandler = (error: KhoraError) => RuntimePlan<unknown>;

function scopedKernelPrimitive<Return>(
  blueprint: RuntimeBlueprint<Return>,
  options?: RuntimeScopedOptions,
) {
  const plan = lowerPlan(blueprint());
  const resumableFailureHandler = options?.onResumableBranchFailure;
  const kernelOnResumableFailure = toKernelOnResumableFailure(resumableFailureHandler);
  const kernelOptions = toKernelScopedOptions(options?.spec, kernelOnResumableFailure);
  return kernelScoped<Return>(plan, kernelOptions);
}

function toKernelOnResumableFailure(
  onResumableFailure: RuntimeResumableFailureHandler | undefined,
): ResumableFailureHandler | undefined {
  if (!onResumableFailure) {
    return;
  }
  return (failure: Failure) =>
    lowerPlan(runtimeResumableReplacementAsEither(onResumableFailure, new KhoraError(failure)));
}

function toKernelScopedOptions(
  spec: RuntimeScopedOptions["spec"],
  onResumableFailure: ResumableFailureHandler | undefined,
): ScopedOptions {
  if (spec && onResumableFailure) {
    return { onResumableBranchFailure: onResumableFailure, spec };
  }
  if (spec) {
    return { spec };
  }
  if (onResumableFailure) {
    return { onResumableBranchFailure: onResumableFailure };
  }
  return {};
}

function* runtimeResumableReplacementAsEither(
  onResumableFailure: RuntimeResumableFailureHandler,
  error: KhoraError,
): RuntimePlan<Either<Failure, unknown>> {
  try {
    const replacement = yield* onResumableFailure(error);
    return right(replacement);
  } catch (caught) {
    return left(failureFromUnknown(caught));
  }
}
