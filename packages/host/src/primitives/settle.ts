import type { RiteCoroutine, RiteFutureSettle } from "#/contracts";
import { encodeRitual } from "#/boundary/index";
import { settle as kernelSettle } from "@shajara/kernel";
import { right } from "@shajara/kernel/utils";

/**
 * Settles a future with a value.
 *
 * @param futureSettle - Settlement authority.
 * @param value - Value to publish.
 * @returns Completion after settlement is requested.
 */
export function settle<Result>(
  futureSettle: RiteFutureSettle<Result>,
  value: Result,
): RiteCoroutine<void> {
  return encodeRitual(() => kernelSettle(futureSettle, right(value)))();
}
