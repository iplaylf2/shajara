import type { Plan, ProcessRef, ScopeRef, ScopeSpec } from "#src/contracts";

export type SchedulerScopeRef<Return> = ScopeRef<Return, SchedulerScopeSpec>;

export function schedulerScopeSpec(config: SchedulerScopeSpecConfig): SchedulerScopeSpec {
  return {
    handler: config.handler,
    role: "scheduler",
  };
}

export interface SchedulerScopeSpecConfig {
  readonly handler: SchedulerHandler;
}

export type SchedulerHandler = (
  readyProcesses: ReadonlyArray<ProcessRef<unknown>>,
) => Plan<ReadonlyArray<ProcessRef<unknown>>>;

export interface SchedulerScopeSpec extends ScopeSpec {
  readonly role: "scheduler";
  readonly handler: SchedulerHandler;
}
