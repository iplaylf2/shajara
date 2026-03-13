import type { ECHO_TOKEN, FutureKey, FutureResult, SigilShape } from "#src/contracts";
import type { Option } from "#src/utils";

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
