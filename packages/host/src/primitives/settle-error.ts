import type { RiteCoroutine, RiteFutureSettle } from "#src/contracts";
import { encodeRitual, toFailure } from "#src/boundary";
import { settle as kernelSettle } from "@shajara/kernel";
import { left } from "@shajara/kernel/utils";

export function settleError<Return>(
  futureSettle: RiteFutureSettle<Return>,
  error: Error,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelSettle(futureSettle, left(toFailure(error))))();
}
