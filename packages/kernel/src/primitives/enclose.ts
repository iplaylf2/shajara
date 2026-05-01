import type { Ritual, Wisp } from "#/contracts";
import type { BranchHandle } from "#/sigils/index";
import { branch } from "./branch";

export function enclose<Relic>(entry: Ritual<Relic>): Wisp<BranchHandle<Relic>> {
  return branch(entry, { failureMode: "contain" });
}
