import type { ECHO_TOKEN, FutureResult, FutureSettleKey, Sigil } from "#src/contracts";

export function settle<Result>(
  futureSettle: FutureSettleKey<Result>,
  result: FutureResult<Result>,
): SettleSigil<Result> {
  return {
    futureSettle,
    kind: "settle",
    result,
  };
}

export interface SettleSigil<Result> extends Sigil {
  readonly kind: "settle";
  readonly futureSettle: FutureSettleKey<Result>;
  readonly result: FutureResult<Result>;
  readonly [ECHO_TOKEN]?: readonly [void];
}
