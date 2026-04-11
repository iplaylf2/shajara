import type { ECHO_TOKEN, FutureResult, FutureSettleKey, SigilShape } from "#/contracts";

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

export interface SettleSigil<Result> extends SigilShape {
  readonly kind: "settle";
  readonly futureSettle: FutureSettleKey<Result>;
  readonly result: FutureResult<Result>;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
