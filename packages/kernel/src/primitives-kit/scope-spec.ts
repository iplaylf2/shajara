export type ScopeRole = "standard" | "scheduler" | "reaper" | "ingress" | "portal";
export type SpawnableScopeRole = ScopeRole;

const SCOPE_SPEC_TOKEN: unique symbol = Symbol("scope-spec");

export interface ScopeSpec<Role extends ScopeRole = ScopeRole> {
  readonly role: Role;
  readonly [SCOPE_SPEC_TOKEN]: "scope-spec";
}

export interface StandardScopeSpecOptions {}
export interface SchedulerScopeSpecOptions {}
export interface ReaperScopeSpecOptions {}
export interface IngressScopeSpecOptions {}
export interface PortalScopeSpecOptions {}

function createScopeSpec<Role extends ScopeRole, Options>(
  role: Role,
  _options?: Options,
): ScopeSpec<Role> {
  return { [SCOPE_SPEC_TOKEN]: "scope-spec", role };
}

export const standardScopeSpec = (options?: StandardScopeSpecOptions): ScopeSpec<"standard"> =>
  createScopeSpec("standard", options);
export const schedulerScopeSpec = (options?: SchedulerScopeSpecOptions): ScopeSpec<"scheduler"> =>
  createScopeSpec("scheduler", options);
export const reaperScopeSpec = (options?: ReaperScopeSpecOptions): ScopeSpec<"reaper"> =>
  createScopeSpec("reaper", options);
export const ingressScopeSpec = (options?: IngressScopeSpecOptions): ScopeSpec<"ingress"> =>
  createScopeSpec("ingress", options);
export const portalScopeSpec = (options?: PortalScopeSpecOptions): ScopeSpec<"portal"> =>
  createScopeSpec("portal", options);
