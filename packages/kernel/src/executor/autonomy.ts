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

/** Scope descriptor carrying scheduler or reaper autonomy. */
export interface AutonomyScopeDescriptor extends ScopeDescriptor {
  readonly [autonomyKey]: AutonomyOptions;
}

/** Autonomy option that routes runnable processes through a scheduler. */
export interface SchedulerOption {
  readonly scheduler: Scheduler;
}

/** Autonomy option that adjudicates stalled closing scopes. */
export interface ReaperOption {
  readonly reaper: Reaper;
}

/** Assigns runnable processes to processors. */
export interface Scheduler {
  /**
   * Selects a processing lane.
   *
   * @param process - Runnable process.
   * @returns Processor for the task.
   */
  assign(process: ProcessRef<unknown>): Processor;
}

/** Decides whether a closing scope should continue waiting or fail. */
export interface Reaper {
  /**
   * Evaluates stalled convergence.
   *
   * @param scope - Closing scope.
   * @returns None to keep waiting, or a failure to force failure convergence.
   */
  adjudicate(scope: ScopeRef<unknown>): Wisp<Option<Failure>>;
}

/** Scheduler, reaper, or both for an autonomous scope. */
export type AutonomyOptions = SchedulerOption | ReaperOption | (SchedulerOption & ReaperOption);

function isAutonomyScope(descriptor: ScopeDescriptor): descriptor is AutonomyScopeDescriptor {
  return autonomyKey in descriptor;
}

const autonomyKey: unique symbol = Symbol("autonomy");
