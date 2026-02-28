import type { KhoraFailure, Plan } from "#src/contracts";
import type { Either } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export type ResourceProvide<ProvidedValue> = (value: ProvidedValue) => Plan<never>;

export type ResourceBody<ProvidedValue> = (
  provide: ResourceProvide<ProvidedValue>,
) => Plan<unknown>;

export function resource<ProvidedValue>(
  _body: ResourceBody<ProvidedValue>,
): Plan<Either<KhoraFailure, ProvidedValue>> {
  return notImplemented("kernel primitive 'resource'");
}
