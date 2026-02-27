import type { ScopeRef, ScopeSpec } from "#src/contracts";

export interface ReaperScopeSpecOptions {}
export interface ReaperScopeSpec extends ScopeSpec {
  readonly role: "reaper";
}
export type ReaperScopeRef<Return> = ScopeRef<Return, ReaperScopeSpec>;

export function reaperScopeSpec(_options?: ReaperScopeSpecOptions): ReaperScopeSpec {
  return {
    role: "reaper",
  };
}
