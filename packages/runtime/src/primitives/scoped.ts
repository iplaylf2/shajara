import type { ResumableErrorHandler, ScopedOptions } from "@khora/kernel/primitives";
import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import type { ScopeSpec } from "@khora/kernel";
import { scoped as kernelScoped } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";
import { unwrapEither } from "#src/primitives-kit/unwrap-either";

export function* scoped<Return, CaughtValue = never>(
  blueprint: RuntimeBlueprint<Return>,
  options?: RuntimeScopedOptions<CaughtValue>,
): RuntimePlan<Return | CaughtValue> {
  const either = yield* liftPlan(scopedKernelPrimitive(blueprint, options));
  return unwrapEither(either);
}

export type RuntimeResumableErrorHandler<CaughtValue> = (error: Error) => RuntimePlan<CaughtValue>;
export interface RuntimeScopedOptions<CaughtValue> {
  readonly onResumableError?: RuntimeResumableErrorHandler<CaughtValue>;
  readonly spec?: ScopeSpec;
}

function scopedKernelPrimitive<Return, CaughtValue = never>(
  runtimeBlueprint: RuntimeBlueprint<Return>,
  options?: RuntimeScopedOptions<CaughtValue>,
) {
  const plan = lowerPlan(runtimeBlueprint());
  const kernelOnResumableError = toKernelOnResumableError(options?.onResumableError);
  const kernelOptions = toKernelScopedOptions(options?.spec, kernelOnResumableError);
  return kernelScoped<Return, CaughtValue>(plan, kernelOptions);
}

function toKernelOnResumableError<CaughtValue>(
  runtimeOnResumableError: RuntimeResumableErrorHandler<CaughtValue> | undefined,
): ResumableErrorHandler<CaughtValue> | undefined {
  if (!runtimeOnResumableError) {
    return;
  }
  return (error: Error) => lowerPlan(runtimeOnResumableError(error));
}

function toKernelScopedOptions<CaughtValue>(
  spec: RuntimeScopedOptions<CaughtValue>["spec"],
  onResumableError: ResumableErrorHandler<CaughtValue> | undefined,
): ScopedOptions<CaughtValue> {
  if (spec && onResumableError) {
    return { onResumableError, spec };
  }
  if (spec) {
    return { spec };
  }
  if (onResumableError) {
    return { onResumableError };
  }
  return {};
}
