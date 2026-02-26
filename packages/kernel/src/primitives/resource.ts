import type { Either } from "fp-ts/Either";
import type { KhoraFailure } from "#src/contracts/failure";
import type { Plan } from "#src/contracts/plan";
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
