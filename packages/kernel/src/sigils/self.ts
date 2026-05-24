import type { ECHO_TOKEN, ProcessRef, ScopeRef, SigilShape } from "#/contracts";

/**
 * Creates a sigil that reads the current scope and process identity.
 *
 * @returns Self sigil whose echo is the current scope and process references.
 */
export function self(): SelfSigil {
  return {
    kind: "self",
  };
}

/** Sigil that reads the current scope and process identity. */
export interface SelfSigil extends SigilShape {
  readonly kind: "self";
  readonly [ECHO_TOKEN]?: readonly [SelfHandle];
}

/** Current process reference and its owning scope reference. */
export interface SelfHandle {
  readonly scope: ScopeRef<unknown>;
  readonly process: ProcessRef<unknown>;
}
