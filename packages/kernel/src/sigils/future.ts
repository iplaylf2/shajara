import type { ECHO_TOKEN, FutureHandle, SigilShape } from "#/contracts";

/**
 * Encodes future allocation as a sigil.
 *
 * @returns `future` sigil.
 */
export function future<Result>(): FutureSigil<Result> {
  return {
    kind: "future",
  };
}

/** Future-allocation sigil. */
export interface FutureSigil<Result> extends SigilShape {
  readonly kind: "future";
  readonly [ECHO_TOKEN]?: readonly [FutureHandle<Result>];
}
