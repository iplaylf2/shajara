import type { RiteCoroutine, RiteRoutine } from "#src/contracts";
import { decodeRitual, encodeRitual } from "#src/boundary";
import { defer as kernelDefer } from "@shajara/kernel";

export function defer(cleanup: RiteRoutine<void>): RiteCoroutine<void> {
  return encodeRitual(() => kernelDefer(decodeRitual(cleanup)))();
}
