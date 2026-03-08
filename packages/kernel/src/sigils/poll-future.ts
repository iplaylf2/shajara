import type { ECHO_TOKEN, Failure, FutureKey, Sigil } from "#src/contracts";
import type { Either, Option } from "#src/utils";

export function pollFuture<Value extends Either<Failure, unknown>>(
  futureKey: FutureKey<Value>,
): PollFutureSigil<Value> {
  return {
    futureKey,
    kind: "poll-future",
  };
}

export interface PollFutureSigil<Value extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "poll-future";
  readonly futureKey: FutureKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Option<Value>];
}
