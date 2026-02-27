import type { ScopeSpec } from "#src/contracts/scope";

export interface SchedulerScopeSpecOptions {}
export interface SchedulerScopeSpec extends ScopeSpec {
  readonly role: "scheduler";
}

export function schedulerScopeSpec(_options?: SchedulerScopeSpecOptions): SchedulerScopeSpec {
  return {
    role: "scheduler",
  };
}
