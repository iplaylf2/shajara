import type { ECHO_TOKEN, FutureKey, FutureResult, SigilShape } from "#/contracts";

/**
 * Creates a sigil that waits for future settlement.
 *
 * @returns Wait sigil whose echo is the in-band settlement result.
 */
export function wait<Result>(future: FutureKey<Result>): WaitSigil<Result> {
  return {
    future,
    kind: "wait",
  };
}

/** Sigil that waits for future settlement. */
export interface WaitSigil<Result> extends SigilShape {
  readonly kind: "wait";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [FutureResult<Result>];
}
