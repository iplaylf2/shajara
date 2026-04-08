import type { SelfHandle } from "#/sigils";
import type { Wisp } from "#/contracts";
import { self as selfSigil } from "#/sigils";
import { wisp } from "#/internal/fp";

export type { SelfHandle } from "#/sigils";

export function self(): Wisp<SelfHandle> {
  return wisp.liftF(selfSigil());
}
