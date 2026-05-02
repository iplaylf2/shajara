import type { AutonomyOptions, AutonomyScopeDescriptor } from "#/executor/autonomy";
import type { Ritual, Wisp } from "#/contracts";
import type { BranchHandle } from "#/primitives/index";
import { branch } from "#/primitives/index";
import { describeAutonomy } from "#/executor/autonomy";

export function autonomy<Relic>(
  entry: Ritual<Relic>,
  options: AutonomyOptions,
): Wisp<BranchHandle<Relic, AutonomyScopeDescriptor>> {
  return branch(entry, describeAutonomy(options));
}
