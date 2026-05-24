import type { Either } from "#/utils/index";
import type { Failure } from "#/failures";
import type { KEY_TOKEN } from "./token";

/** Observation authority for a future's in-band settlement result. */
export interface FutureKey<Result> {
  readonly [KEY_TOKEN]: "future";
  readonly [RESULT_TOKEN]?: readonly [FutureResult<Result>];
}

/** Settlement authority for a future's in-band settlement result. */
export interface FutureSettleKey<Result> {
  readonly [KEY_TOKEN]: "future-settle";
  readonly [RESULT_TOKEN]?: readonly [FutureResult<Result>];
}

/** Settled future result: in-band failure or successful value. */
export type FutureResult<Result> = Either<Failure, Result>;

/** Observation and settlement authorities for the same future. */
export type FutureHandle<Result> = readonly [FutureKey<Result>, FutureSettleKey<Result>];

declare const RESULT_TOKEN: unique symbol;
