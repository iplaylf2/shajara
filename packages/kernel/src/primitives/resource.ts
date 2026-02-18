import type { Plan } from "#src/plan-contract";
import { notImplemented } from "#src/internal/not-implemented";

export type KernelResourceProvide<ProvidedValue> = (value: ProvidedValue) => Plan<never>;

export type KernelResourceBody<ProvidedValue> = (
  provide: KernelResourceProvide<ProvidedValue>,
) => Plan<unknown>;

export function resource<ProvidedValue>(
  _body: KernelResourceBody<ProvidedValue>,
): Plan<ProvidedValue> {
  return notImplemented("kernel primitive 'resource'");
}
