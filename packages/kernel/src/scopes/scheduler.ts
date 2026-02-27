import type { ScopeRef, ScopeSpec } from "#src/contracts";

export interface SchedulerScopeSpecOptions {}
export interface SchedulerScopeSpec extends ScopeSpec {
  readonly role: "scheduler";
}
export type SchedulerScopeRef<Return> = ScopeRef<Return, SchedulerScopeSpec>;

export function schedulerScopeSpec(_options?: SchedulerScopeSpecOptions): SchedulerScopeSpec {
  return {
    role: "scheduler",
  };
}
