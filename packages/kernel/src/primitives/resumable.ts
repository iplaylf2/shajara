import type { Either } from "fp-ts/Either";
import type { Plan } from "#src/contracts/plan";
import { notImplemented } from "#src/internal/not-implemented";

export function resumable<Return>(_plan: Plan<Return>): Plan<Either<unknown, Return>> {
  return notImplemented("kernel primitive 'resumable'");
}
