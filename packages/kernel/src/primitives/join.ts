import type { KhoraFailure, Plan, ScopeRef } from "#src/contracts";
import type { Either } from "fp-ts/Either";
import { notImplemented } from "#src/internal/not-implemented";

export function join<Return>(_spawned: ScopeRef<Return>): Plan<Either<KhoraFailure, Return>> {
  return notImplemented("kernel primitive 'join'");
}
