import type { ECHO_TOKEN, FutureKey, FutureResult, SigilShape } from "#/contracts";

export function wait<Result>(future: FutureKey<Result>): WaitSigil<Result> {
  return {
    future,
    kind: "wait",
  };
}

export interface WaitSigil<Result> extends SigilShape {
  readonly kind: "wait";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [FutureResult<Result>];
}
