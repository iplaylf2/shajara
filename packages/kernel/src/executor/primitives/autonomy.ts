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
 * Applies executor governance to a child scope.
 *
 * @param entry - Child entry.
 * @param options - Governance policy.
 * @returns Autonomous branch handle.
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
