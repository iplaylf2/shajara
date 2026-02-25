import type { ResourceBody, ResourceProvide } from "@khora/kernel/primitives";
import type { RuntimePlan } from "#src/contracts";
import { resource as kernelResource } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";
import { unwrapEither } from "#src/primitives-kit/unwrap-either";

export type RuntimeResourceProvide<ProvidedValue> = (value: ProvidedValue) => RuntimePlan<never>;

export type RuntimeResourceBody<ProvidedValue> = (
  provide: RuntimeResourceProvide<ProvidedValue>,
) => RuntimePlan<unknown>;

function resourceKernelPrimitive<ProvidedValue>(runtimeBody: RuntimeResourceBody<ProvidedValue>) {
  const kernelBody: ResourceBody<ProvidedValue> = (
    kernelProvide: ResourceProvide<ProvidedValue>,
  ) => {
    const runtimeProvide: RuntimeResourceProvide<ProvidedValue> = (value: ProvidedValue) =>
      liftPlan(kernelProvide(value));

    return lowerPlan(runtimeBody(runtimeProvide));
  };

  return kernelResource(kernelBody);
}

export function* resource<ProvidedValue>(
  body: RuntimeResourceBody<ProvidedValue>,
): RuntimePlan<ProvidedValue> {
  const either = yield* liftPlan(resourceKernelPrimitive(body));
  return unwrapEither(either);
}
