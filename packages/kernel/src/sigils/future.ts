import type { ECHO_TOKEN, FutureHandle, SigilShape } from "#/contracts";

/**
 * Creates a sigil that allocates a future owned by the current scope.
 *
 * @returns Future sigil whose echo is the observation and settlement handle.
 */
export function future<Result>(): FutureSigil<Result> {
  return {
    kind: "future",
  };
}

/** Sigil that allocates a future owned by the current scope. */
export interface FutureSigil<Result> extends SigilShape {
  readonly kind: "future";
  readonly [ECHO_TOKEN]?: readonly [FutureHandle<Result>];
}
