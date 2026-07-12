import type { ProcessRef, ScopeDescriptor, ScopeRef, Wisp } from "#/contracts/index.js";
import type { Failure } from "#/failures/index.js";
import type { Option } from "#/utils/index.js";
import type { Processor } from "./processor.js";

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

/** Autonomy option for routing runnable child processes to processors. */
export interface SchedulerOption {
  readonly scheduler: Scheduler;
}

/** Autonomy option for adjudicating a closing scope that cannot converge naturally. */
export interface ReaperOption {
  readonly reaper: Reaper;
}

/** Chooses processors for runnable processes within an autonomous scope. */
export interface Scheduler {
  /**
   * Selects the processor that should progress a runnable process.
   *
   * @returns Processor selected for the runnable process.
   */
  assign: (process: ProcessRef<unknown>) => Processor;
}

/** Decides whether a stalled closing scope should keep waiting or fail. */
export interface Reaper {
  /**
   * Evaluates stalled convergence.
   *
   * @returns `none` to keep waiting, or a failure to force failure convergence.
   */
  adjudicate: (scope: ScopeRef<unknown>) => Wisp<Option<Failure>>;
}

/** Scheduler, reaper, or both for an autonomous scope. */
export type AutonomyOptions = SchedulerOption | ReaperOption | (SchedulerOption & ReaperOption);

function isAutonomyScope(descriptor: ScopeDescriptor): descriptor is AutonomyScopeDescriptor {
  return autonomyKey in descriptor;
}

const autonomyKey: unique symbol = Symbol("autonomy");
