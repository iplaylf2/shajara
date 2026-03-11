import type { Either } from "#src/utils";
import type { Failure } from "./failure";
import type { KEY_TOKEN } from "./token";

export interface FutureKey<Result> {
  readonly [KEY_TOKEN]: "future";
  readonly [RESULT_TOKEN]?: readonly [FutureResult<Result>];
}

export interface FutureSettleKey<Result> {
  readonly [KEY_TOKEN]: "future-settle";
  readonly [RESULT_TOKEN]?: readonly [FutureResult<Result>];
}

export type FutureResult<Result> = Either<Failure, Result>;

declare const RESULT_TOKEN: unique symbol;
