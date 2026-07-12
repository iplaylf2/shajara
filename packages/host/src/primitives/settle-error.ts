import type { RiteCoroutine, RiteFutureSettle } from "#/contracts/index.js";
import { encodeRitual, toFailure } from "#/boundary/index.js";
import { settle as kernelSettle } from "@shajara/kernel";
import { left } from "@shajara/kernel/utils";

/** Requests settlement of a future with a JavaScript error. */
export function settleError<Return>(
  futureSettle: RiteFutureSettle<Return>,
  error: Error,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelSettle(futureSettle, left(toFailure(error))))();
}
