import type { ECHO_TOKEN, ProcessRef, ScopeRef, SigilShape } from "#/contracts";

export function self(): SelfSigil {
  return {
    kind: "self",
  };
}

export interface SelfSigil extends SigilShape {
  readonly kind: "self";
  readonly [ECHO_TOKEN]?: readonly [SelfHandle];
}

export interface SelfHandle {
  readonly scope: ScopeRef<unknown>;
  readonly process: ProcessRef<unknown>;
}
