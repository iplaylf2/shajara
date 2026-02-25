const SCOPE_REF_TOKEN: unique symbol = Symbol("scope-ref");
const SCOPE_SPEC_TOKEN: unique symbol = Symbol("scope-spec");

export interface ScopeRef<ReturnValue = unknown> {
  readonly [SCOPE_REF_TOKEN]: "scope-ref";
  readonly _return?: ReturnValue;
}

export interface ScopeSpec<Role extends string = string> {
  readonly role: Role;
  readonly [SCOPE_SPEC_TOKEN]: "scope-spec";
}
