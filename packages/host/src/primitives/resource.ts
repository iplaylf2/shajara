import type { RiteCoroutine, RiteFuture } from "#src/contracts";
import { decodeRitual, encodeRitual } from "#src/boundary";
import { resource as kernelResource } from "@shajara/kernel";

export function* resource<ProvidedValue>(
  body: HostResourceBody<ProvidedValue>,
): RiteCoroutine<RiteFuture<ProvidedValue>> {
  return yield* encodeRitual(() => createKernelResource(body))();
}

export type HostResourceBody<ProvidedValue> = (
  provide: HostResourceProvide<ProvidedValue>,
) => RiteCoroutine<unknown>;

export type HostResourceProvide<ProvidedValue> = (value: ProvidedValue) => RiteCoroutine<never>;

function createKernelResource<ProvidedValue>(body: HostResourceBody<ProvidedValue>) {
  return kernelResource<ProvidedValue>((kernelProvide) =>
    decodeRitual(() => body((value) => encodeRitual(() => kernelProvide(value))()))(),
  );
}
