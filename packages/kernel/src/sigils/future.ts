import type { ECHO_TOKEN, Failure, FutureKey, FutureSettleKey, Sigil } from "#src/contracts";
import type { Either } from "#src/utils";

export function future<Result extends Either<Failure, unknown>>(): FutureSigil<Result> {
  return {
    kind: "future",
  };
}

export interface FutureSigil<Result extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "future";
  readonly [ECHO_TOKEN]?: readonly [[FutureKey<Result>, FutureSettleKey<Result>]];
}
