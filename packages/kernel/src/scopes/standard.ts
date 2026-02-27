import type { ScopeRef, ScopeSpec } from "#src/contracts";

export interface StandardScopeSpecOptions {}
export interface StandardScopeSpec extends ScopeSpec {
  readonly role: "standard";
}
export type StandardScopeRef<Return> = ScopeRef<Return, StandardScopeSpec>;

export function standardScopeSpec(_options?: StandardScopeSpecOptions): StandardScopeSpec {
  return {
    role: "standard",
  };
}
