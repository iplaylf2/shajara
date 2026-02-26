import type { ScopeSpec } from "#src/contracts/scope";
import { createScopeSpec } from "#src/scopes-kit/factory";

export interface StandardScopeSpecOptions {}
export type StandardScopeSpec = ScopeSpec<"standard">;

export const standardScopeSpec = (options?: StandardScopeSpecOptions): StandardScopeSpec =>
  createScopeSpec("standard", options);
