import type { ExecutionScopeRef } from "./execution-scope";

/** Handle for launched work and its live lifecycle state. */
export interface LaunchHandle<Result> {
  /** Scope that owns the launched work's convergence future. */
  readonly scope: ExecutionScopeRef<Result>;
  /** Current lifecycle state for the launched work. */
  readonly status: LaunchStatus;
}

/** Lifecycle state observed for launched work. */
export type LaunchStatus = "open" | "closing" | "closed";
