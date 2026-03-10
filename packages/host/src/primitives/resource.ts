import type { RiteCoroutine, RiteFuture } from "#src/contracts";
import { decodeRitual, encodeRitual } from "#src/boundary";
import { resource as kernelResource } from "@shajara/kernel";

export function* resource<ProvidedValue>(
  body: ResourceBody<ProvidedValue>,
): RiteCoroutine<RiteFuture<ProvidedValue>> {
  return yield* encodeRitual(() => createKernelResource(body))();
}

export type ResourceBody<ProvidedValue> = (
  provide: ResourceProvide<ProvidedValue>,
) => RiteCoroutine<unknown>;

export type ResourceProvide<ProvidedValue> = (value: ProvidedValue) => RiteCoroutine<never>;

function createKernelResource<ProvidedValue>(body: ResourceBody<ProvidedValue>) {
  return kernelResource<ProvidedValue>((kernelProvide) =>
    decodeRitual(() => body((value) => encodeRitual(() => kernelProvide(value))()))(),
  );
}
