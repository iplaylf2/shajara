import type { Either } from "#src/utils";
import type { Failure } from "./failure";
import type { KEY_TOKEN } from "./token";

declare const VALUE_TOKEN: unique symbol;

// oxlint-disable-next-line id-length
export type FutureKeyValue<K extends FutureKey<Either<Failure, unknown>>> =
  K extends FutureKey<infer Value> ? Value : never;

// oxlint-disable-next-line id-length
export type FutureResolverKeyValue<
  // oxlint-disable-next-line id-length
  K extends FutureResolverKey<Either<Failure, unknown>>,
> = K extends FutureResolverKey<infer Value> ? Value : never;

export interface FutureKey<Value extends Either<Failure, unknown>> {
  readonly [KEY_TOKEN]: "future";
  readonly [VALUE_TOKEN]?: readonly [Value];
}

export interface FutureResolverKey<Value extends Either<Failure, unknown>> {
  readonly [KEY_TOKEN]: "future-resolver";
  readonly [VALUE_TOKEN]?: readonly [Value];
}
