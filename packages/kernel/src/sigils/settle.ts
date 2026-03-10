import type { ECHO_TOKEN, Failure, FutureSettleKey, Sigil } from "#src/contracts";
import type { Either } from "#src/utils";

export function settle<Result extends Either<Failure, unknown>>(
  futureSettle: FutureSettleKey<Result>,
  result: Result,
): SettleSigil<Result> {
  return {
    futureSettle,
    kind: "settle",
    result,
  };
}

export interface SettleSigil<Result extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "settle";
  readonly futureSettle: FutureSettleKey<Result>;
  readonly result: Result;
  readonly [ECHO_TOKEN]?: readonly [void];
}
