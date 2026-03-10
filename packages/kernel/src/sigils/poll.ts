import type { ECHO_TOKEN, Failure, FutureKey, Sigil } from "#src/contracts";
import type { Either, Option } from "#src/utils";

export function poll<Result extends Either<Failure, unknown>>(
  future: FutureKey<Result>,
): PollSigil<Result> {
  return {
    future,
    kind: "poll",
  };
}

export interface PollSigil<Result extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "poll";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [Option<Result>];
}
