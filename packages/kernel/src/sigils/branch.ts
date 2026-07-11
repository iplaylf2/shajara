// oxlint-disable-next-line unicorn/prefer-export-from -- Exported type is also used locally.
import type {
  ECHO_TOKEN,
  ProcessRef,
  Ritual,
  ScopeDescriptor,
  ScopeRef,
  SigilShape,
} from "#/contracts";

/**
 * Creates a sigil that opens a child scope with one structural entry process.
 *
 * @param descriptor - Metadata carried by the child scope reference.
 * @returns Branch sigil whose echo is the child scope and process handle.
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

/** Sigil that opens a child scope with one structural entry process. */
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
