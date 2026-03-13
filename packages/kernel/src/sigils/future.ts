import type { ECHO_TOKEN, FutureKey, FutureSettleKey, SigilShape } from "#src/contracts";

export function future<Result>(): FutureSigil<Result> {
  return {
    kind: "future",
  };
}

export interface FutureSigil<Result> extends SigilShape {
  readonly kind: "future";
  readonly [ECHO_TOKEN]?: readonly [[FutureKey<Result>, FutureSettleKey<Result>]];
}
