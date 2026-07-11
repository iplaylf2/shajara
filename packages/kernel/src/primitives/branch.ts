import type { FutureKey, Ritual, ScopeDescriptor, ScopeRef, Wisp } from "#/contracts/index.js";
import type { BranchHandle } from "#/sigils/index.js";
import { branch as branchSigil } from "#/sigils/index.js";
import { wisp } from "#/internal/fp/index.js";

/**
 * Opens a child scope with one structural entry process.
 *
 * @param descriptor - Metadata carried by the child scope reference.
 * @returns Child scope and process references.
 */
export function branch<Relic, Descriptor extends ScopeDescriptor = ScopeDescriptor>(
  entry: Ritual<Relic>,
  descriptor?: Descriptor,
): Wisp<BranchHandle<Relic, Descriptor>> {
  return wisp.liftF(branchSigil(entry, descriptor));
}

/** Scope reference paired with an outcome future exposed by a composed primitive. */
export type ScopedOutcome<Result> = readonly [scope: ScopeRef<unknown>, outcome: FutureKey<Result>];

export type { BranchHandle } from "#/sigils/index.js";
