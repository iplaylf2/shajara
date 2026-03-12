import type { RiteCoroutine, RiteFuture } from "#src/contracts";
import { decodeRituals, encodeRitual } from "#src/boundary";
import type { RiteRoutineTuple } from "#src/boundary";
import type { UnknownArray } from "type-fest";
import { all as kernelAll } from "@shajara/kernel";

export function all<Returns extends UnknownArray>(
  primitives: RiteRoutineTuple<Returns>,
): RiteCoroutine<RiteFuture<Returns>> {
  return encodeRitual(() => kernelAll(decodeRituals(primitives)))();
}
