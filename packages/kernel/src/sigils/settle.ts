import type { ECHO_TOKEN, Failure, FutureSettleKey, Sigil } from "#src/contracts";
import type { Either } from "#src/utils";

export function settle<Value extends Either<Failure, unknown>>(
  futureSettleKey: FutureSettleKey<Value>,
  result: Value,
): SettleSigil<Value> {
  return {
    futureSettleKey,
    kind: "settle",
    result,
  };
}

export interface SettleSigil<Value extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "settle";
  readonly futureSettleKey: FutureSettleKey<Value>;
  readonly result: Value;
  readonly [ECHO_TOKEN]?: readonly [void];
}
