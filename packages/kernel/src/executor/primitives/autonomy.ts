import type {
  AutonomyOptions,
  AutonomyScopeDescriptor,
  Reaper,
  ReaperOption,
  Scheduler,
  SchedulerOption,
} from "#/executor/autonomy";
import type { Ritual, Wisp } from "#/contracts";
import type { BranchHandle } from "#/primitives/index";
import { branch } from "#/primitives/index";
import { describeAutonomy } from "#/executor/autonomy";

/**
 * Opens a child scope whose scheduler or reaper policy is supplied by the caller.
 *
 * @returns Autonomous child scope and process references.
 */
export function autonomy<Relic>(
  entry: Ritual<Relic>,
  options: AutonomyOptions,
): Wisp<BranchHandle<Relic, AutonomyScopeDescriptor>> {
  return branch(entry, describeAutonomy(options));
}

export type {
  AutonomyOptions,
  AutonomyScopeDescriptor,
  Reaper,
  ReaperOption,
  Scheduler,
  SchedulerOption,
};
