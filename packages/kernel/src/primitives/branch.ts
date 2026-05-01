import type { FutureKey, Ritual, ScopeDescriptor, ScopeRef, Wisp } from "#/contracts";
import type { BranchHandle } from "#/sigils/index";
import { branch as branchSigil } from "#/sigils/index";
import { wisp } from "#/internal/fp";

export function branch<Relic, Descriptor extends ScopeDescriptor = ScopeDescriptor>(
  entry: Ritual<Relic>,
  descriptor?: Descriptor,
): Wisp<BranchHandle<Relic, Descriptor>> {
  return wisp.liftF(branchSigil(entry, descriptor));
}

export type ScopedOutcome<Result> = readonly [scope: ScopeRef<unknown>, outcome: FutureKey<Result>];

export type { BranchHandle } from "#/sigils/index";
