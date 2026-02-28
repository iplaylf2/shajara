import type { KhoraFailure, Plan } from "#src/contracts";
import type { Either } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export function resource<ProvidedValue>(
  _body: ResourceBody<ProvidedValue>,
): Plan<Either<KhoraFailure, ProvidedValue>> {
  return notImplemented("kernel primitive 'resource'");
}

export type ResourceBody<ProvidedValue> = (
  provide: ResourceProvide<ProvidedValue>,
) => Plan<unknown>;

export type ResourceProvide<ProvidedValue> = (value: ProvidedValue) => Plan<never>;
