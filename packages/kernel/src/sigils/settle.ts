import type { ECHO_TOKEN, FutureResult, FutureSettleKey, SigilShape } from "#/contracts";

/**
 * Creates a sigil that requests in-band future settlement.
 *
 * @returns Settle sigil that completes when the settlement request has been processed.
 */
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

/** Sigil that requests in-band future settlement. */
export interface SettleSigil<Result> extends SigilShape {
  readonly kind: "settle";
  readonly futureSettle: FutureSettleKey<Result>;
  readonly result: FutureResult<Result>;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
