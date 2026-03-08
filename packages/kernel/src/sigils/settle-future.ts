import type { ECHO_TOKEN, Failure, FutureKey, Sigil } from "#src/contracts";
import type { Either } from "#src/utils";

export function settleFuture<Value extends Either<Failure, unknown>>(
  futureKey: FutureKey<Value>,
  result: Value,
): SettleFutureSigil<Value> {
  return {
    futureKey,
    kind: "settle-future",
    result,
  };
}

export interface SettleFutureSigil<Value extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "settle-future";
  readonly futureKey: FutureKey<Value>;
  readonly result: Value;
  readonly [ECHO_TOKEN]?: readonly [void];
}
