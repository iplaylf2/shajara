import type { ScopeSpec } from "#src/contracts/scope";

export interface StandardScopeSpecOptions {}
export interface StandardScopeSpec extends ScopeSpec {
  readonly role: "standard";
}

export function standardScopeSpec(_options?: StandardScopeSpecOptions): StandardScopeSpec {
  return {
    role: "standard",
  };
}
