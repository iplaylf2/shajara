import type { ExecutionScopeRef } from "./execution-scope";

export interface LaunchHandle<Result> {
  readonly scope: ExecutionScopeRef<Result>;
  readonly status: LaunchStatus;
}

export type LaunchStatus = "open" | "closing" | "closed";
