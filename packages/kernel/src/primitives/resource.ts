import type { Plan } from "#src/contracts/plan";
import { notImplemented } from "#src/internal/not-implemented";

export type ResourceProvide<ProvidedValue> = (value: ProvidedValue) => Plan<never>;

export type ResourceBody<ProvidedValue> = (
  provide: ResourceProvide<ProvidedValue>,
) => Plan<unknown>;

export function resource<ProvidedValue>(_body: ResourceBody<ProvidedValue>): Plan<ProvidedValue> {
  return notImplemented("kernel primitive 'resource'");
}
