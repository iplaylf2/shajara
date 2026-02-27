import type { RuntimePlan } from "#src/contracts";
import { resource as kernelResource } from "@khora/kernel/primitives";
import { liftPlan } from "#src/adapter/plan-lift";
import { lowerPlan } from "#src/adapter/plan-lower";
import { unwrapEither } from "#src/primitives-kit/unwrap-either";

export type RuntimeResourceProvide<ProvidedValue> = (value: ProvidedValue) => RuntimePlan<never>;

export type RuntimeResourceBody<ProvidedValue> = (
  provide: RuntimeResourceProvide<ProvidedValue>,
) => RuntimePlan<unknown>;

function createKernelResource<ProvidedValue>(runtimeBody: RuntimeResourceBody<ProvidedValue>) {
  return kernelResource<ProvidedValue>((kernelProvide) =>
    lowerPlan(runtimeBody((value) => liftPlan(kernelProvide(value)))),
  );
}

export function* resource<ProvidedValue>(
  body: RuntimeResourceBody<ProvidedValue>,
): RuntimePlan<ProvidedValue> {
  const either = yield* liftPlan(createKernelResource(body));
  return unwrapEither(either);
}
