import type { ECHO_TOKEN, Failure, FutureKey, Sigil } from "#src/contracts";
import type { Either } from "#src/utils";

export function wait<Result extends Either<Failure, unknown>>(
  future: FutureKey<Result>,
): WaitSigil<Result> {
  return {
    future,
    kind: "wait",
  };
}

export interface WaitSigil<Result extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "wait";
  readonly future: FutureKey<Result>;
  readonly [ECHO_TOKEN]?: readonly [Result];
}
