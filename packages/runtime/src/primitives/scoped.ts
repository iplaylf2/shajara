import type { KhoraFailure, ScopeSpec } from "@khora/kernel";
import type { ResumableFailureHandler, ScopedOptions } from "@khora/kernel/primitives";
import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { RuntimeKhoraFailureError } from "#src/errors";
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

export type RuntimeResumableFailureHandler = (
  error: RuntimeKhoraFailureError,
) => RuntimePlan<unknown>;
export interface RuntimeScopedOptions {
  readonly onResumableFailure?: RuntimeResumableFailureHandler;
  readonly spec?: ScopeSpec;
}

function scopedKernelPrimitive<Return>(
  runtimeBlueprint: RuntimeBlueprint<Return>,
  options?: RuntimeScopedOptions,
) {
  const plan = lowerPlan(runtimeBlueprint());
  const kernelOnResumableFailure = toKernelOnResumableFailure(options?.onResumableFailure);
  const kernelOptions = toKernelScopedOptions(options?.spec, kernelOnResumableFailure);
  return kernelScoped<Return>(plan, kernelOptions);
}

function toKernelOnResumableFailure(
  runtimeOnResumableFailure: RuntimeResumableFailureHandler | undefined,
): ResumableFailureHandler | undefined {
  if (!runtimeOnResumableFailure) {
    return;
  }
  return (failure: KhoraFailure) =>
    lowerPlan(runtimeOnResumableFailure(new RuntimeKhoraFailureError(failure)));
}

function toKernelScopedOptions(
  spec: RuntimeScopedOptions["spec"],
  onResumableFailure: ResumableFailureHandler | undefined,
): ScopedOptions {
  if (spec && onResumableFailure) {
    return { onResumableFailure, spec };
  }
  if (spec) {
    return { spec };
  }
  if (onResumableFailure) {
    return { onResumableFailure };
  }
  return {};
}
