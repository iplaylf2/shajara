import type { ECHO_TOKEN, ProcessRef, ScopeRef, SigilShape } from "#/contracts";

/**
 * Encodes current scope and process lookup as a sigil.
 *
 * @returns `self` sigil.
 */
export function self(): SelfSigil {
  return {
    kind: "self",
  };
}

/** Current-identity sigil. */
export interface SelfSigil extends SigilShape {
  readonly kind: "self";
  readonly [ECHO_TOKEN]?: readonly [SelfHandle];
}

/** Current process reference and its enclosing scope reference. */
export interface SelfHandle {
  readonly scope: ScopeRef<unknown>;
  readonly process: ProcessRef<unknown>;
}
