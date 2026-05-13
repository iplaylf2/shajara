import type { RiteCoroutine, RiteFutureSettle } from "#/contracts";
import { encodeRitual, toFailure } from "#/boundary/index";
import { settle as kernelSettle } from "@shajara/kernel";
import { left } from "@shajara/kernel/utils";

/** Settles a future with a failure represented by a JavaScript error. */
export function settleError<Return>(
  futureSettle: RiteFutureSettle<Return>,
  error: Error,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelSettle(futureSettle, left(toFailure(error))))();
}
