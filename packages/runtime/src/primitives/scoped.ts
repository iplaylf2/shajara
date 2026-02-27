import type { KhoraFailure, ScopeSpec } from "@khora/kernel";
import type { ResumableFailureHandler, ScopedOptions } from "@khora/kernel/primitives";
import type { RuntimeBlueprint, RuntimePlan } from "#src/contracts";
import { RuntimeKhoraError, khoraFailureFromRuntimeUnknown } from "#src/errors";
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
  error: RuntimeKhoraError,
) => RuntimePlan<unknown>;
export interface RuntimeScopedOptions {
  readonly onResumableBranchFailure?: RuntimeResumableFailureHandler;
  readonly spec?: ScopeSpec;
}

function scopedKernelPrimitive<Return>(
  runtimeBlueprint: RuntimeBlueprint<Return>,
  options?: RuntimeScopedOptions,
) {
  const plan = lowerPlan(runtimeBlueprint());
  const runtimeResumableFailureHandler = options?.onResumableBranchFailure;
  const kernelOnResumableFailure = toKernelOnResumableFailure(runtimeResumableFailureHandler);
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
    lowerPlan(
      runtimeResumableReplacementAsEither(
        runtimeOnResumableFailure,
        new RuntimeKhoraError(failure),
      ),
    );
}

function* runtimeResumableReplacementAsEither(
  runtimeOnResumableFailure: RuntimeResumableFailureHandler,
  error: RuntimeKhoraError,
): RuntimePlan<
  | { readonly _tag: "Left"; readonly left: KhoraFailure }
  | { readonly _tag: "Right"; readonly right: unknown }
> {
  try {
    const replacement = yield* runtimeOnResumableFailure(error);
    return { _tag: "Right", right: replacement };
  } catch (caught) {
    return { _tag: "Left", left: khoraFailureFromRuntimeUnknown(caught) };
  }
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
