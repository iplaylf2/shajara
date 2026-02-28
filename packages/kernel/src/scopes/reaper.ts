import type { ScopeRef, ScopeSpec } from "#src/contracts";

export type ReaperScopeRef<Return> = ScopeRef<Return, ReaperScopeSpec>;

export function reaperScopeSpec(_options?: ReaperScopeSpecOptions): ReaperScopeSpec {
  return {
    role: "reaper",
  };
}

export interface ReaperScopeSpecOptions {}
export interface ReaperScopeSpec extends ScopeSpec {
  readonly role: "reaper";
}
