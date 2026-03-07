import { liftBlueprint, lowerBlueprint, unwrapEither } from "#src/boundary";
import type { RiteCoroutine } from "#src/contracts";
import { resource as kernelResource } from "@shajara/kernel";

export function* resource<ProvidedValue>(
  body: HostResourceBody<ProvidedValue>,
): RiteCoroutine<ProvidedValue> {
  const outcome = yield* liftBlueprint(() => createKernelResource(body))();
  return unwrapEither(outcome);
}

export type HostResourceBody<ProvidedValue> = (
  provide: HostResourceProvide<ProvidedValue>,
) => RiteCoroutine<unknown>;

export type HostResourceProvide<ProvidedValue> = (value: ProvidedValue) => RiteCoroutine<never>;

function createKernelResource<ProvidedValue>(runtimeBody: HostResourceBody<ProvidedValue>) {
  return kernelResource<ProvidedValue>((kernelProvide) =>
    lowerBlueprint(() => runtimeBody((value) => liftBlueprint(() => kernelProvide(value))()))(),
  );
}
