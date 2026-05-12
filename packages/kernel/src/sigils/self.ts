import type { ECHO_TOKEN, ProcessRef, ScopeRef, SigilShape } from "#/contracts";

/**
 * Models current-process introspection.
 *
 * @returns Self instruction.
 */
export function self(): SelfSigil {
  return {
    kind: "self",
  };
}

/** Sigil shape for current process introspection. */
export interface SelfSigil extends SigilShape {
  readonly kind: "self";
  readonly [ECHO_TOKEN]?: readonly [SelfHandle];
}

/** Current scope and process references. */
export interface SelfHandle {
  readonly scope: ScopeRef<unknown>;
  readonly process: ProcessRef<unknown>;
}
