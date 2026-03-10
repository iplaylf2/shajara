import type { RiteCoroutine, RiteFutureSettle, RiteSettlement } from "#src/contracts";
import { encodeRitual, toFailure } from "#src/boundary";
import { left, right } from "@shajara/kernel/utils";
import { settle as kernelSettle } from "@shajara/kernel";

export function settle<Result>(
  futureSettle: RiteFutureSettle<Result>,
  settlement: RiteSettlement<Result>,
): RiteCoroutine<void> {
  return encodeRitual(() =>
    kernelSettle(
      futureSettle,
      "resolve" in settlement ? right(settlement.resolve) : left(toFailure(settlement.reject)),
    ),
  )();
}
