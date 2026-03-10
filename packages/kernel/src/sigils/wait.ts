import type { ECHO_TOKEN, Failure, FutureKey, Sigil } from "#src/contracts";
import type { Either } from "#src/utils";

export function wait<Value extends Either<Failure, unknown>>(
  futureKey: FutureKey<Value>,
): WaitSigil<Value> {
  return {
    futureKey,
    kind: "wait",
  };
}

export interface WaitSigil<Value extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "wait";
  readonly futureKey: FutureKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Value];
}
