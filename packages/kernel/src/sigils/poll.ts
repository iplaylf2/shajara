import type { ECHO_TOKEN, Failure, FutureKey, Sigil } from "#src/contracts";
import type { Either, Option } from "#src/utils";

export function poll<Value extends Either<Failure, unknown>>(
  futureKey: FutureKey<Value>,
): PollSigil<Value> {
  return {
    futureKey,
    kind: "poll",
  };
}

export interface PollSigil<Value extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "poll";
  readonly futureKey: FutureKey<Value>;
  readonly [ECHO_TOKEN]?: readonly [Option<Value>];
}
