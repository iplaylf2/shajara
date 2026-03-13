import type { RiteCoroutine, RiteFuture, RiteRoutine } from "#src/contracts";
import { decodeRitual, encodeRitual } from "#src/boundary";
import { fork as kernelFork } from "@shajara/kernel";

export function fork<Return>(entry: RiteRoutine<Return>): RiteCoroutine<RiteFuture<Return>> {
  return encodeRitual(() => kernelFork(decodeRitual(entry)))();
}
