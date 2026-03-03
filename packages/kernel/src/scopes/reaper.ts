import type { Failure, Plan, ScopeRef, ScopeSpec } from "#src/contracts";
import type { Option } from "#src/utils";

export type ReaperScopeRef<Return> = ScopeRef<Return, ReaperScopeSpec>;

export function reaperScopeSpec(config: ReaperScopeSpecConfig): ReaperScopeSpec {
  return {
    handler: config.handler,
    role: "reaper",
  };
}

export interface ReaperScopeSpecConfig {
  readonly handler: ReaperHandler;
}

export type ReaperHandler = (
  cleanupScopes: ReadonlyArray<ScopeRef<unknown>>,
  cause: Option<Failure>,
) => Plan<Option<Failure>>;

export interface ReaperScopeSpec extends ScopeSpec {
  readonly role: "reaper";
  readonly handler: ReaperHandler;
}
