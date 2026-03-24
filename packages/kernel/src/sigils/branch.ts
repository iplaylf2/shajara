import type {
  ECHO_TOKEN,
  ProcessRef,
  Ritual,
  ScopeDescriptor,
  ScopeRef,
  SigilShape,
} from "#/contracts";

export function branch<Relic>(
  entry: Ritual<Relic>,
  descriptor: ScopeDescriptor = { failureMode: "propagate" },
): BranchSigil<Relic> {
  return {
    descriptor,
    entry,
    kind: "branch",
  };
}

export interface BranchSigil<Relic> extends SigilShape {
  readonly kind: "branch";
  readonly entry: Ritual<Relic>;
  readonly descriptor: ScopeDescriptor;
  readonly [ECHO_TOKEN]?: readonly [BranchHandle<Relic>];
}

export interface BranchHandle<Relic> {
  readonly scope: ScopeRef<Relic>;
  readonly process: ProcessRef<Relic>;
}
