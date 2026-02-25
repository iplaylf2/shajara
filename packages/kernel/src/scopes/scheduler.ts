import type { ScopeSpec } from "#src/contracts/scope";
import { createScopeSpec } from "#src/scopes-kit/factory";

export interface SchedulerScopeSpecOptions {}

export const schedulerScopeSpec = (options?: SchedulerScopeSpecOptions): ScopeSpec<"scheduler"> =>
  createScopeSpec("scheduler", options);
