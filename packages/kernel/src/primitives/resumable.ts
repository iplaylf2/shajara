import type { KhoraFailure, Plan } from "#src/contracts";
import type { Either } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export function resumable<Return>(_plan: Plan<Return>): Plan<Either<KhoraFailure, Return>> {
  return notImplemented("kernel primitive 'resumable'");
}
