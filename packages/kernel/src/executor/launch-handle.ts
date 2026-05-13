import type { ExecutionScopeRef } from "./execution-scope";

/** Handle for a launched executor entry and its observable lifecycle state. */
export interface LaunchHandle<Result> {
  readonly scope: ExecutionScopeRef<Result>;
  readonly status: LaunchStatus;
}

/** Lifecycle state observed for a launched executor entry. */
export type LaunchStatus = "open" | "closing" | "closed";
