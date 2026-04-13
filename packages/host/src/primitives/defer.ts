import type { RiteCoroutine, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary";
import { defer as kernelDefer } from "@shajara/kernel";

export function defer(cleanup: RiteRoutine<void>): RiteCoroutine<void> {
  return encodeRitual(() => kernelDefer(decodeRitual(cleanup)))();
}
