const SCOPE_REF_TOKEN: unique symbol = Symbol("scope-ref");
const SCOPE_SPEC_TOKEN: unique symbol = Symbol("scope-spec");

export interface ScopeRef<Return = unknown> {
  readonly [SCOPE_REF_TOKEN]: "scope-ref";
  readonly _return?: Return;
}

export interface ScopeSpec<Role extends string = string> {
  readonly role: Role;
  readonly [SCOPE_SPEC_TOKEN]: "scope-spec";
}

export interface ScopeTerminatedFailure {
  readonly kind: "scope-terminated";
  readonly scopeRef: ScopeRef;
}

export function scopeTerminated(scopeRef: ScopeRef): ScopeTerminatedFailure {
  return {
    kind: "scope-terminated",
    scopeRef,
  };
}
