import type { RiteCoroutine, RiteFuture } from "#/contracts";
import { decodeRituals, encodeRitual } from "#/boundary";
import type { RiteRoutineTuple } from "#/boundary";
import type { UnknownArray } from "type-fest";
import { all as kernelAll } from "@shajara/kernel";

export function all<Returns extends UnknownArray>(
  routines: RiteRoutineTuple<Returns>,
): RiteCoroutine<RiteFuture<Returns>> {
  return encodeRitual(() => kernelAll(decodeRituals(routines)))();
}
