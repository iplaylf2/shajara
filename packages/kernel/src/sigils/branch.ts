import type { ECHO_TOKEN, ProcessRef, Ritual, ScopeRef, SigilShape } from "#/contracts";

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

export interface ScopeDescriptor {
  readonly failureMode: FailureMode;
}

export interface BranchHandle<Relic> {
  readonly scope: ScopeRef<Relic>;
  readonly process: ProcessRef<Relic>;
}

export type FailureMode = "propagate" | "contain";
