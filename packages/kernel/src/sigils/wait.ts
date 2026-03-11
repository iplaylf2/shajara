import type { ECHO_TOKEN, FutureKey, FutureResult, Sigil } from "#src/contracts";

export function wait<Result>(future: FutureKey<Result>): WaitSigil<Result> {
  return {
    future,
    kind: "wait",
  };
}

export interface WaitSigil<Result> extends Sigil {
  readonly kind: "wait";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [FutureResult<Result>];
}
