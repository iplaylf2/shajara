// oxlint-disable-next-line unicorn/prefer-export-from -- Exported types are also used locally.
import type {
  AutonomyOptions,
  AutonomyScopeDescriptor,
  Reaper,
  ReaperOption,
  Scheduler,
  SchedulerOption,
} from "#/executor/autonomy.js";
import type { Ritual, Wisp } from "#/contracts/index.js";
import type { BranchHandle } from "#/primitives/index.js";
import { branch } from "#/primitives/index.js";
import { describeAutonomy } from "#/executor/autonomy.js";

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
