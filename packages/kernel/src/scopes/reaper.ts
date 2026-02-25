import type { ScopeSpec } from "#src/contracts/scope";
import { createScopeSpec } from "#src/scopes-kit/factory";

export interface ReaperScopeSpecOptions {}

export const reaperScopeSpec = (options?: ReaperScopeSpecOptions): ScopeSpec<"reaper"> =>
  createScopeSpec("reaper", options);
