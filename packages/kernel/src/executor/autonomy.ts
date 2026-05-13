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

/** Scope descriptor carrying scheduler or reaper autonomy options. */
export interface AutonomyScopeDescriptor extends ScopeDescriptor {
  readonly [autonomyKey]: AutonomyOptions;
}

/** Autonomy option for routing runnable processes to processors. */
export interface SchedulerOption {
  readonly scheduler: Scheduler;
}

/** Autonomy option for adjudicating stalled closing scopes. */
export interface ReaperOption {
  readonly reaper: Reaper;
}

/** Chooses processors for runnable processes within an autonomous scope. */
export interface Scheduler {
  /**
   * Selects a processor for a runnable process.
   *
   * @returns Processor selected for the runnable process.
   */
  assign(process: ProcessRef<unknown>): Processor;
}

/** Decides whether a stalled closing scope should keep waiting or fail. */
export interface Reaper {
  /**
   * Evaluates stalled convergence.
   *
   * @returns `none` to keep waiting, or a failure to force failure convergence.
   */
  adjudicate(scope: ScopeRef<unknown>): Wisp<Option<Failure>>;
}

/** Scheduler, reaper, or both for an autonomous scope. */
export type AutonomyOptions = SchedulerOption | ReaperOption | (SchedulerOption & ReaperOption);

function isAutonomyScope(descriptor: ScopeDescriptor): descriptor is AutonomyScopeDescriptor {
  return autonomyKey in descriptor;
}

const autonomyKey: unique symbol = Symbol("autonomy");
