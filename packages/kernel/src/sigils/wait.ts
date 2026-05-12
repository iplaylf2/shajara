import type { ECHO_TOKEN, FutureKey, FutureResult, SigilShape } from "#/contracts";

/**
 * Models blocking future observation.
 *
 * @param future - Future to observe.
 * @returns Wait instruction.
 */
export function wait<Result>(future: FutureKey<Result>): WaitSigil<Result> {
  return {
    future,
    kind: "wait",
  };
}

/** Sigil shape for blocking future observation. */
export interface WaitSigil<Result> extends SigilShape {
  readonly kind: "wait";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [FutureResult<Result>];
}
