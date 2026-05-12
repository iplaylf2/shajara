import type { ExecutionScopeRef } from "./execution-scope";

/** Handle for an executor entry and its lifecycle state. */
export interface LaunchHandle<Result> {
  readonly scope: ExecutionScopeRef<Result>;
  readonly status: LaunchStatus;
}

/** Observable lifecycle state for an executor entry. */
export type LaunchStatus = "open" | "closing" | "closed";
