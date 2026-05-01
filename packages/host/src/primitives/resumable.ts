import type { RiteCoroutine, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary/index";
import { resumable as kernelResumable } from "@shajara/kernel";
import { waitOutcome } from "#/primitives-kit";

export function* resumable<Return>(ritual: RiteRoutine<Return>): RiteCoroutine<Return> {
  const outcome = yield* encodeRitual(() => kernelResumable(decodeRitual(ritual)))();
  return yield* waitOutcome(outcome);
}
