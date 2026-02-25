import type { Either } from "fp-ts/Either";
import type { Plan } from "#src/contracts/plan";
import { notImplemented } from "#src/internal/not-implemented";

export function resumable<ReturnValue>(
  _plan: Plan<ReturnValue>,
): Plan<Either<unknown, ReturnValue>> {
  return notImplemented("kernel primitive 'resumable'");
}
