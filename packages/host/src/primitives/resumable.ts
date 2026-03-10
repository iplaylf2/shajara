import type { RiteCoroutine, RiteFuture, RiteRoutine } from "#src/contracts";
import { decodeRitual, encodeRitual } from "#src/boundary";
import { resumable as kernelResumable } from "@shajara/kernel";

export function* resumable<Return>(ritual: RiteRoutine<Return>): RiteCoroutine<RiteFuture<Return>> {
  return yield* encodeRitual(() => kernelResumable(decodeRitual(ritual)))();
}
