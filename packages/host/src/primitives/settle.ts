import type { RiteCoroutine, RiteFutureSettle } from "#/contracts";
import { encodeRitual } from "#/boundary";
import { settle as kernelSettle } from "@shajara/kernel";
import { right } from "@shajara/kernel/utils";

export function settle<Result>(
  futureSettle: RiteFutureSettle<Result>,
  value: Result,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelSettle(futureSettle, right(value)))();
}
