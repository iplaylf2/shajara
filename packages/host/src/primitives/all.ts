import { decodeRituals, encodeRitual, unwrapEither } from "#src/boundary";
import type { RiteCoroutine } from "#src/contracts";
import type { RiteRoutineTuple } from "#src/boundary";
import type { UnknownArray } from "type-fest";
import { all as kernelAll } from "@shajara/kernel";

export function* all<Returns extends UnknownArray>(
  primitives: RiteRoutineTuple<Returns>,
): RiteCoroutine<Returns> {
  const outcome = yield* encodeRitual(() => kernelAll(decodeRituals(primitives)))();
  return unwrapEither(outcome);
}
