import type { RiteCoroutine, RiteFuture, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary";
import { resumable as kernelResumable } from "@shajara/kernel";

export function resumable<Return>(ritual: RiteRoutine<Return>): RiteCoroutine<RiteFuture<Return>> {
  return encodeRitual(() => kernelResumable(decodeRitual(ritual)))();
}
