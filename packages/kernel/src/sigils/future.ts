import type { ECHO_TOKEN, FutureHandle, SigilShape } from "#/contracts";

export function future<Result>(): FutureSigil<Result> {
  return {
    kind: "future",
  };
}

export interface FutureSigil<Result> extends SigilShape {
  readonly kind: "future";
  readonly [ECHO_TOKEN]?: readonly [FutureHandle<Result>];
}
