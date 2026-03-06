import type { Failure, Plan, ProcessRef, Processor, ScopeSpec } from "#src/contracts";
import type { Option } from "#src/utils";

export function governorScopeSpec(config: GovernorScopeSpecConfig): GovernorScopeSpec {
  return {
    capabilities: config.capabilities,
    role: "governor",
  };
}

export interface GovernorScopeSpecConfig {
  readonly capabilities: GovernorCapabilities;
}

export type GovernorCapabilities =
  | GovernorSchedulerCapabilities
  | GovernorReaperCapabilities
  | GovernorFullCapabilities;

export interface GovernorSchedulerCapabilities {
  readonly coverage: "scheduler";
  readonly scheduler: SchedulerHandler;
}

export interface GovernorReaperCapabilities {
  readonly coverage: "reaper";
  readonly reaper: ReaperHandler;
}

export interface GovernorFullCapabilities {
  readonly coverage: "full";
  readonly scheduler: SchedulerHandler;
  readonly reaper: ReaperHandler;
}

export type SchedulerHandler = (readyProcess: ProcessRef<unknown>) => Plan<Processor>;

export type ReaperHandler = (suspendedProcess: ProcessRef<unknown>) => Plan<Option<Failure>>;

export interface GovernorScopeSpec extends ScopeSpec {
  readonly role: "governor";
  readonly capabilities: GovernorCapabilities;
}
