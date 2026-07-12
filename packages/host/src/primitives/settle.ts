import type { RiteCoroutine, RiteFutureSettle } from "#/contracts/index.js";
import { encodeRitual } from "#/boundary/index.js";
import { settle as kernelSettle } from "@shajara/kernel";
import { right } from "@shajara/kernel/utils";

/** Requests settlement of a future with a successful value. */
export function settle<Result>(
  futureSettle: RiteFutureSettle<Result>,
  value: Result,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelSettle(futureSettle, right(value)))();
}
