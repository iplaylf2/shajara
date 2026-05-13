import type {
  ECHO_TOKEN,
  ProcessRef,
  Ritual,
  ScopeDescriptor,
  ScopeRef,
  SigilShape,
} from "#/contracts";

/**
 * Encodes child-scope creation as a sigil.
 *
 * @returns `branch` sigil.
 */
export function branch<Relic, Descriptor extends ScopeDescriptor = ScopeDescriptor>(
  entry: Ritual<Relic>,
  descriptor: Descriptor = DEFAULT_SCOPE_DESCRIPTOR as Descriptor,
): BranchSigil<Relic, Descriptor> {
  return {
    descriptor,
    entry,
    kind: "branch",
  };
}

/** Child-scope sigil. */
export interface BranchSigil<
  Relic,
  Descriptor extends ScopeDescriptor = ScopeDescriptor,
> extends SigilShape {
  readonly kind: "branch";
  readonly descriptor: Descriptor;
  readonly entry: Ritual<Relic>;
  readonly [ECHO_TOKEN]?: readonly [BranchHandle<Relic, Descriptor>];
}

/** Scope and entry-process references for a child scope. */
export interface BranchHandle<Relic, Descriptor extends ScopeDescriptor = ScopeDescriptor> {
  readonly scope: ScopeRef<Relic, Descriptor>;
  readonly process: ProcessRef<Relic>;
}

export type { ScopeDescriptor };

const DEFAULT_SCOPE_DESCRIPTOR: ScopeDescriptor = {};
