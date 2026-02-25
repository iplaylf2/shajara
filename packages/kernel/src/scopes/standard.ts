import type { ScopeSpec } from "#src/contracts/scope";
import { createScopeSpec } from "#src/scopes-kit/factory";

export interface StandardScopeSpecOptions {}

export const standardScopeSpec = (options?: StandardScopeSpecOptions): ScopeSpec<"standard"> =>
  createScopeSpec("standard", options);
