import { liftBlueprint, lowerBlueprint, unwrapEither } from "#src/boundary";
import type { RuntimePlan } from "#src/contracts";
import { resource as kernelResource } from "@khora/kernel";

export function* resource<ProvidedValue>(
  body: RuntimeResourceBody<ProvidedValue>,
): RuntimePlan<ProvidedValue> {
  const either = yield* liftBlueprint(() => createKernelResource(body));
  return unwrapEither(either);
}

export type RuntimeResourceBody<ProvidedValue> = (
  provide: RuntimeResourceProvide<ProvidedValue>,
) => RuntimePlan<unknown>;

export type RuntimeResourceProvide<ProvidedValue> = (value: ProvidedValue) => RuntimePlan<never>;

function createKernelResource<ProvidedValue>(runtimeBody: RuntimeResourceBody<ProvidedValue>) {
  return kernelResource<ProvidedValue>((kernelProvide) =>
    lowerBlueprint(() => runtimeBody((value) => liftBlueprint(() => kernelProvide(value))))(),
  );
}
