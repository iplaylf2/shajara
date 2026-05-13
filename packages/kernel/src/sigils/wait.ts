import type { ECHO_TOKEN, FutureKey, FutureResult, SigilShape } from "#/contracts";

/**
 * Encodes blocking future observation as a sigil.
 *
 * @returns `wait` sigil.
 */
export function wait<Result>(future: FutureKey<Result>): WaitSigil<Result> {
  return {
    future,
    kind: "wait",
  };
}

/** Blocking future observation sigil. */
export interface WaitSigil<Result> extends SigilShape {
  readonly kind: "wait";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [FutureResult<Result>];
}
