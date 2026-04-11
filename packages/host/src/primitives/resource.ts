import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary";
import type { ResourceProvide as KernelResourceProvide } from "@shajara/kernel";
import { resource as kernelResource } from "@shajara/kernel";

export function resource<Value>(body: ResourceBody<Value>): RiteCoroutine<RiteFuture<Value>> {
  return encodeRitual(() =>
    kernelResource<Value>((provide) => decodeRitual(() => body(toHostProvide<Value>(provide)))()),
  )();
}

export type ResourceBody<Value> = (provide: ResourceProvide<Value>) => RiteCoroutine<void>;
export type ResourceProvide<Value> = (value: Value) => RiteCoroutine<never>;

function toHostProvide<Value>(provide: KernelResourceProvide<Value>): ResourceProvide<Value> {
  return (value) => encodeRitual(() => provide(value))();
}
