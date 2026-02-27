import type { ScopeSpec } from "#src/contracts/scope";

export interface ReaperScopeSpecOptions {}
export interface ReaperScopeSpec extends ScopeSpec {
  readonly role: "reaper";
}

export const reaperScopeSpec = (_options?: ReaperScopeSpecOptions): ReaperScopeSpec => ({
  role: "reaper",
});
