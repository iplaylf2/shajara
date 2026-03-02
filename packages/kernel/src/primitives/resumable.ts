import type { Blueprint, Failure, Plan } from "#src/contracts";
import type { Either } from "#src/utils";
import { notImplemented } from "#src/internal/not-implemented";

export function resumable<Return>(_entry: Blueprint<Return>): Plan<Either<Failure, Return>> {
  return notImplemented("kernel primitive 'resumable'");
}
