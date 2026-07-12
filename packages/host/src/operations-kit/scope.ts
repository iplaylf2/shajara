import type { RiteCoroutine, RiteRoutine } from "#/contracts/index.js";
import { decodeRitual, encodeRitual } from "#/boundary/index.js";
import { park as kernelPark, spawn } from "@shajara/kernel";

export function* spawnDetached<Return>(routine: RiteRoutine<Return>): RiteCoroutine<void> {
  yield* encodeRitual(() =>
    spawn(decodeRitual(routine), {
      completionMode: "detached",
    }),
  )();
}

export function park(): RiteCoroutine<never> {
  return encodeRitual(() => kernelPark())();
}
