import type { ECHO_TOKEN, Failure, FutureKey, FutureResolverKey, Sigil } from "#src/contracts";
import type { Either } from "#src/utils";

export function future<Value extends Either<Failure, unknown>>(): FutureSigil<Value> {
  return {
    kind: "future",
  };
}

export interface FutureSigil<Value extends Either<Failure, unknown>> extends Sigil {
  readonly kind: "future";
  readonly [ECHO_TOKEN]?: readonly [[FutureKey<Value>, FutureResolverKey<Value>]];
}
