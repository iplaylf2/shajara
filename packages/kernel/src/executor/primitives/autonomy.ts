import type { Ritual, Wisp } from "#/contracts";
import type { AutonomyOptions } from "#/executor/autonomy";
import type { BranchHandle } from "#/primitives/index";
import { branch } from "#/primitives/index";
import { withAutonomy } from "#/executor/autonomy";

export function autonomy<Relic>(
  entry: Ritual<Relic>,
  options: AutonomyOptions,
): Wisp<BranchHandle<Relic>> {
  return branch(entry, withAutonomy(options));
}
