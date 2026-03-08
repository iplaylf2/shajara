import type { ECHO_TOKEN, Failure, FutureKey, Sigil } from "#src/contracts";
import type { Either } from "#src/utils";

export function awaitFuture<Value extends Either<Failure, unknown>>(
  futureKey: FutureKey<Value>,
): AwaitFutureSigil<Value> {
  return {
    futureKey,
    kind: "await-future",
  };
}

export interface AwaitFutureSigil<Value extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "await-future";
  readonly futureKey: FutureKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Value];
}
