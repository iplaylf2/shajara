import type { ECHO_TOKEN, FutureKey, FutureSettleKey, Sigil } from "#src/contracts";

export function future<Result>(): FutureSigil<Result> {
  return {
    kind: "future",
  };
}

export interface FutureSigil<Result> extends Sigil {
  readonly kind: "future";
  readonly [ECHO_TOKEN]?: readonly [[FutureKey<Result>, FutureSettleKey<Result>]];
}
