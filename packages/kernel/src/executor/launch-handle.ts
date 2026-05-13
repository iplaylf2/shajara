import type { ExecutionScopeRef } from "./execution-scope";

/** Handle for a launched executor entry and its live lifecycle state. */
export interface LaunchHandle<Result> {
  /** Registered scope that owns the launched entry's convergence future. */
  readonly scope: ExecutionScopeRef<Result>;
  /** Current lifecycle state for the launched entry. */
  readonly status: LaunchStatus;
}

/** Lifecycle state observed for a launched executor entry. */
export type LaunchStatus = "open" | "closing" | "closed";
