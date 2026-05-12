import type { ECHO_TOKEN, FutureHandle, SigilShape } from "#/contracts";

/**
 * Models future allocation.
 *
 * @returns Future instruction.
 */
export function future<Result>(): FutureSigil<Result> {
  return {
    kind: "future",
  };
}

/** Sigil shape for future allocation. */
export interface FutureSigil<Result> extends SigilShape {
  readonly kind: "future";
  readonly [ECHO_TOKEN]?: readonly [FutureHandle<Result>];
}
