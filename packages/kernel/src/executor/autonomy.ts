import type { ProcessRef, ScopeDescriptor, ScopeRef, Wisp } from "#/contracts";
import type { Failure } from "#/failures";
import type { Option } from "#/utils/index";
import type { Processor } from "./processor";

export function describeAutonomy(options: AutonomyOptions): AutonomyScopeDescriptor {
  return {
    [autonomyKey]: options,
  };
}

export function autonomyOf(descriptor: ScopeDescriptor): AutonomyOptions | null {
  return isAutonomyScope(descriptor) ? descriptor[autonomyKey] : null;
}

export const autonomyKey: unique symbol = Symbol("shajara.autonomy");

export interface AutonomyScopeDescriptor extends ScopeDescriptor {
  readonly [autonomyKey]: AutonomyOptions;
}

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

export type AutonomyOptions = SchedulerOption | ReaperOption | (SchedulerOption & ReaperOption);

function isAutonomyScope(descriptor: ScopeDescriptor): descriptor is AutonomyScopeDescriptor {
  return autonomyKey in descriptor;
}
