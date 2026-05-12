import type { Either } from "#/utils/index";
import type { Failure } from "#/failures";
import type { KEY_TOKEN } from "./token";

/** Observation-only handle for a future's in-band settlement result. */
export interface FutureKey<Result> {
  readonly [KEY_TOKEN]: "future";
  readonly [RESULT_TOKEN]?: readonly [FutureResult<Result>];
}

/** Settlement-only handle for writing a result to a future. */
export interface FutureSettleKey<Result> {
  readonly [KEY_TOKEN]: "future-settle";
  readonly [RESULT_TOKEN]?: readonly [FutureResult<Result>];
}

/** In-band result carried by a kernel future. */
export type FutureResult<Result> = Either<Failure, Result>;

/** Paired observation and settlement handles for the same future. */
export type FutureHandle<Result> = readonly [FutureKey<Result>, FutureSettleKey<Result>];

declare const RESULT_TOKEN: unique symbol;
