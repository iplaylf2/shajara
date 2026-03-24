import type { ECHO_TOKEN, FutureKey, FutureResult, SigilShape } from "#/contracts";
import type { Option } from "#/utils";

export function poll<Result>(future: FutureKey<Result>): PollSigil<Result> {
  return {
    future,
    kind: "poll",
  };
}

export interface PollSigil<Result> extends SigilShape {
  readonly kind: "poll";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [Option<FutureResult<Result>>];
}
