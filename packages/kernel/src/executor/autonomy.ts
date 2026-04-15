import type { ProcessRef, ScopeRef, Wisp } from "#/contracts";
import type { Failure } from "#/failures";
import type { Option } from "#/utils/index";
import type { Processor } from "./processor";
import type { ScopeDescriptor } from "#/sigils/index";

export function withAutonomy(options: AutonomyOptions): AutonomyScopeDescriptor {
  return {
    autonomy: options,
    failureMode: "propagate",
  };
}

export function autonomyOf(descriptor: ScopeDescriptor): AutonomyOptions | null {
  if (!isAutonomyScopeDescriptor(descriptor)) {
    return null;
  }

  return descriptor.autonomy;
}

export interface AutonomyScopeDescriptor extends ScopeDescriptor {
  readonly autonomy: AutonomyOptions;
}

export type AutonomyOptions = SchedulerOption | ReaperOption | (SchedulerOption & ReaperOption);

export interface SchedulerOption {
  readonly scheduler: Scheduler;
}

export interface ReaperOption {
  readonly reaper: Reaper;
}

export interface Scheduler {
  assign(process: ProcessRef<unknown>): Processor;
}

export interface Reaper {
  adjudicate(scope: ScopeRef<unknown>): Wisp<Option<Failure>>;
}

function isAutonomyScopeDescriptor(
  descriptor: ScopeDescriptor,
): descriptor is AutonomyScopeDescriptor {
  return "autonomy" in descriptor;
}
