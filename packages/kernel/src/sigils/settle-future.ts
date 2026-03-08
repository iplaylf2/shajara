import type { ECHO_TOKEN, Failure, FutureResolverKey, Sigil } from "#src/contracts";
import type { Either } from "#src/utils";

export function settleFuture<Value extends Either<Failure, unknown>>(
  futureResolverKey: FutureResolverKey<Value>,
  result: Value,
): SettleFutureSigil<Value> {
  return {
    futureResolverKey,
    kind: "settle-future",
    result,
  };
}

export interface SettleFutureSigil<Value extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "settle-future";
  readonly futureResolverKey: FutureResolverKey<Value>;
  readonly result: Value;
  readonly [ECHO_TOKEN]?: readonly [void];
}
