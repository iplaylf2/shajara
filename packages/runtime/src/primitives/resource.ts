import type { RuntimePlan } from "#src/contracts";
import { resource as kernelResource } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/lift-plan";
import { lowerPlan } from "#src/adapter/lower-plan";
import { unwrapEither } from "#src/primitives-kit";

export function* resource<ProvidedValue>(
  body: RuntimeResourceBody<ProvidedValue>,
): RuntimePlan<ProvidedValue> {
  const either = yield* liftPlan(createKernelResource(body));
  return unwrapEither(either);
}

export type RuntimeResourceBody<ProvidedValue> = (
  provide: RuntimeResourceProvide<ProvidedValue>,
) => RuntimePlan<unknown>;

export type RuntimeResourceProvide<ProvidedValue> = (value: ProvidedValue) => RuntimePlan<never>;

function createKernelResource<ProvidedValue>(runtimeBody: RuntimeResourceBody<ProvidedValue>) {
  return kernelResource<ProvidedValue>((kernelProvide) =>
    lowerPlan(runtimeBody((value) => liftPlan(kernelProvide(value)))),
  );
}
