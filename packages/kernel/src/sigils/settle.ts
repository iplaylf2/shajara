import type { ECHO_TOKEN, FutureResult, FutureSettleKey, SigilShape } from "#/contracts";

/**
 * Models future settlement.
 *
 * @param futureSettle - Settlement authority.
 * @param result - In-band settlement.
 * @returns Settle instruction.
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

/** Sigil shape for future settlement. */
export interface SettleSigil<Result> extends SigilShape {
  readonly kind: "settle";
  readonly futureSettle: FutureSettleKey<Result>;
  readonly result: FutureResult<Result>;
  // oxlint-disable-next-line no-invalid-void-type
  readonly [ECHO_TOKEN]?: readonly [void];
}
