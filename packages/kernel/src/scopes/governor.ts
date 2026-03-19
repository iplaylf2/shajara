import type { FailureShape, ProcessRef, ScopeDescriptor, Wisp } from "#src/contracts";
import type { Option } from "#src/utils";

export function governorScopeDescriptor(
  config: GovernorScopeDescriptorConfig,
): GovernorScopeDescriptor {
  return {
    capabilities: config.capabilities,
    failureMode: "contain",
  };
}

export interface GovernorScopeDescriptorConfig {
  readonly capabilities: GovernorCapabilities;
}

export interface GovernorScopeDescriptor extends ScopeDescriptor {
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

export interface Processor {
  readonly _processorTodo?: never;
}

export type SchedulerHandler = (readyProcess: ProcessRef<unknown>) => Wisp<Processor>;

export type ReaperHandler = (suspendedProcess: ProcessRef<unknown>) => Wisp<Option<FailureShape>>;
