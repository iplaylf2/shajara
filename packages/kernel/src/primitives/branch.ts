import type { BranchHandle, ScopeDescriptor } from "#/sigils/index";
import type { Ritual, Wisp } from "#/contracts";
import { branch as branchSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function branch<Relic>(
  entry: Ritual<Relic>,
  descriptor?: ScopeDescriptor,
): Wisp<BranchHandle<Relic>> {
  return wisp.liftF(branchSigil(entry, descriptor));
}
