import type {
  ECHO_TOKEN,
  ProcessRef,
  Ritual,
  ScopeRef,
  ScopeSpec,
  SigilShape,
} from "#src/contracts";
import { standardScopeSpec } from "#src/scopes";

export function branch<Relic>(
  entry: Ritual<Relic>,
  spec: ScopeSpec = standardScopeSpec(),
): BranchSigil<Relic> {
  return {
    entry,
    kind: "branch",
    spec,
  };
}

export interface BranchSigil<Relic> extends SigilShape {
  readonly kind: "branch";
  readonly entry: Ritual<Relic>;
  readonly spec: ScopeSpec;
  readonly [ECHO_TOKEN]?: readonly [BranchDescriptor<Relic>];
}

export interface BranchDescriptor<Relic> {
  readonly scopeRef: ScopeRef<Relic>;
  readonly processRef: ProcessRef<Relic>;
}
