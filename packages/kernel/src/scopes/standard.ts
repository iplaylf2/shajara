import type { ScopeSpec } from "#src/contracts/scope";

export interface StandardScopeSpecOptions {}
export interface StandardScopeSpec extends ScopeSpec {
  readonly role: "standard";
}

export const standardScopeSpec = (_options?: StandardScopeSpecOptions): StandardScopeSpec => ({
  role: "standard",
});
