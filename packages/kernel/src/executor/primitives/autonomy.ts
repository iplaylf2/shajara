import type { FutureKey, ProcessRef, Ritual, ScopeRef, Wisp } from "#/contracts";
import type { Failure } from "#/failures";
import type { Option } from "#/utils";
import type { Processor } from "#/executor/processor";
import { notImplemented } from "#/internal/not-implemented";

export function autonomy<Relic>(
  _entry: Ritual<Relic>,
  _options: AutonomyOptions,
): Wisp<FutureKey<Relic>> {
  return notImplemented("");
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
  reap(scope: ScopeRef<unknown>): Wisp<Option<Failure>>;
}
