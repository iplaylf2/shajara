import type { ScopeSpec } from "#src/contracts/scope";

export interface SchedulerScopeSpecOptions {}
export interface SchedulerScopeSpec extends ScopeSpec {
  readonly role: "scheduler";
}

export const schedulerScopeSpec = (_options?: SchedulerScopeSpecOptions): SchedulerScopeSpec => ({
  role: "scheduler",
});
