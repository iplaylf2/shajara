import type { RiteCoroutine, RiteRoutine } from "#/contracts";
import { decodeRitual, encodeRitual } from "#/boundary/index";
import { branch as kernelBranch } from "@shajara/kernel";
import { waitChild } from "#/primitives-kit";

export function* branch<Return>(entry: RiteRoutine<Return>): RiteCoroutine<Return> {
  const child = yield* encodeRitual(() => kernelBranch(decodeRitual(entry)))();
  return yield* waitChild(child);
}
