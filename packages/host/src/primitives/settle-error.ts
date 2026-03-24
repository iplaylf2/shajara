import type { RiteCoroutine, RiteFutureSettle } from "#/contracts";
import { encodeRitual, toFailure } from "#/boundary";
import { settle as kernelSettle } from "@shajara/kernel";
import { left } from "@shajara/kernel/utils";

export function settleError<Return>(
  futureSettle: RiteFutureSettle<Return>,
  error: Error,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelSettle(futureSettle, left(toFailure(error))))();
}
